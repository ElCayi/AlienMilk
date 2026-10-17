import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { AdminService } from '../../../core/services/admin.service';
import { credentialLabel } from '../../../features/attendance/attendance';
import { sessionSchedule } from '../../../features/sessions/session.presenter';
import { EstadoEvento, EventoAdmin, Reserva, ReservaEditar, Usuario } from '../../../models/api.models';
import { PanelDialogComponent } from '../../../shared/panel/panel-dialog.component';
import { ReservationEditorComponent } from '../../../shared/panel/reservation-editor.component';
import {
  errorMessage,
  fieldErrors,
  formatDay,
  formatDayTime,
  reservationWhen,
  formatMoney,
  matches,
  plural,
  profileLabel,
  reservationState,
  sessionState,
  cancellationLine,
  paymentBadge,
  paymentLine,
  reviewLabel,
} from '../../../shared/panel/panel-format';
import { revealAtTop, revealExpanded } from '../../../shared/panel/reveal-row';
import { TableSort } from '../../../shared/panel/table-sort';
import {
  dateFields,
  FilterBarComponent,
  isoDay,
  FilterField,
  FilterPreset,
  FilterValues,
  matchesDate,
} from '../../../shared/panel/filter-bar.component';
import { KeepHeightDirective } from '../../../shared/keep-height/keep-height.directive';
import { AdminSummaryService } from '../admin-summary.service';
import { DemoFootComponent } from '../demo-foot.component';

/** Una reserva admite de 1 a 10 plazas, y nadie pasa de 10 en la misma sesión (lo comprueba el servidor). */
const MAX_PLAZAS = 10;

/** Los filtros y lo que valen sin filtrar: lo vivo de todas las sesiones, de cualquier fecha, pago y cliente. */
const FILTER_DEFAULTS: FilterValues = {
  q: '',
  sesion: '',
  estado: 'vivas',
  fecha: '',
  desde: '',
  hasta: '',
  pago: '',
  revision: '',
  cliente: '',
};

/**
 * Si una reserva pasa los filtros que no son de texto ni de sesión (esos los mira `searched`): su estado,
 * su fecha, su pago, su revisión y si tiene cuenta. Pura: la usan la tabla y las cuentas de los filtros listos.
 */
function passes(reserva: Reserva, values: FilterValues, today = new Date()): boolean {
  const vivas = live(reserva);
  const estado = {
    vivas,
    confirmadas: vivas && reserva.estadoEvento === 'ACTIVO',
    'sesion-cancelada': vivas && reserva.estadoEvento === 'CANCELADO',
    celebradas: vivas && reserva.estadoEvento === 'TERMINADO',
    canceladas: !!reserva.canceladaEn && !reserva.sesionArchivada,
    archivadas: reserva.sesionArchivada,
    todas: true,
  }[values['estado'] || 'vivas'];
  if (!estado) {
    return false;
  }
  if (!matchesDate(reserva.fechaInicioEvento, values, today)) {
    return false;
  }
  const pago = {
    '': true,
    pendiente: reserva.estadoPago === 'PENDIENTE',
    tarjeta: reserva.estadoPago === 'PAGADA',
    taquilla: reserva.estadoPago === 'EN_TAQUILLA',
    cobrada: reserva.estadoPago === 'COBRADA_TAQUILLA',
    devolver: (reserva.devoluciones ?? []).some((devolucion) => devolucion.estado === 'PENDIENTE'),
  }[values['pago'] ?? ''];
  if (!pago) {
    return false;
  }
  const revision = {
    '': true,
    alguna: reserva.revision !== null,
    pendiente: reserva.revision === 'PENDIENTE' && !reserva.canceladaEn,
    aceptada: reserva.revision === 'ACEPTADA',
    'no-aceptada': reserva.revision === 'NO_ACEPTADA',
  }[values['revision'] ?? ''];
  if (!revision) {
    return false;
  }
  return { '': true, 'con-cuenta': !!reserva.username, 'sin-cuenta': !reserva.username }[values['cliente'] ?? ''] ?? true;
}

/** Ni cancelada ni de una sesión archivada: lo que se mira a diario. */
const live = (reserva: Reserva) => !reserva.canceladaEn && !reserva.sesionArchivada;

/** Las que ocupan plazas y cuentan en las cifras: todas menos las canceladas. */
const holds = (reserva: Reserva) => !reserva.canceladaEn;

/** Columnas por las que se ordena la tabla. */
type SortKey = 'numero' | 'cliente' | 'sesion' | 'fecha' | 'plazas' | 'estado';

/** Al ordenar por estado: las confirmadas, las de sesión cancelada, las celebradas. */
const STATE_ORDER: Record<EstadoEvento, number> = { ACTIVO: 0, CANCELADO: 1, TERMINADO: 2 };

/** Las canceladas, al final. */
const stateRank = (reserva: Reserva) => (reserva.canceladaEn ? 3 : STATE_ORDER[reserva.estadoEvento as EstadoEvento]);

const byText = (a: string, b: string) => a.localeCompare(b, 'es', { sensitivity: 'base' });

const COMPARE: Record<SortKey, (a: Reserva, b: Reserva) => number> = {
  numero: (a, b) => a.idReserva - b.idReserva,
  cliente: (a, b) => byText(a.nombreCliente, b.nombreCliente),
  sesion: (a, b) => byText(a.nombreEvento, b.nombreEvento),
  fecha: (a, b) =>
    (a.fechaInicioEvento + a.horaInicioEvento).localeCompare(b.fechaInicioEvento + b.horaInicioEvento),
  plazas: (a, b) => a.cantidad - b.cantidad,
  estado: (a, b) => stateRank(a) - stateRank(b),
};

/** Las tres preguntas del panel: qué pasa con una reserva, quién es un cliente, cómo va una sesión. */
type View = 'reservas' | 'clientes' | 'sesiones';

const VIEWS: { value: View; label: string }[] = [
  { value: 'reservas', label: 'Reserva' },
  { value: 'clientes', label: 'Cliente' },
  { value: 'sesiones', label: 'Sesión' },
];

/**
 * A quién se agrupa una reserva: su cuenta o, sin cuenta (por teléfono, o de una cuenta borrada), su
 * teléfono; si tampoco lo hay, va sola.
 */
const clientKey = (reserva: Reserva): string =>
  reserva.username ?? `sin-cuenta-${reserva.telefono?.replace(/\D/g, '') || reserva.idReserva}`;

/** Un cliente, con todas sus reservas y lo que suman. */
interface ClientGroup {
  /** Su cuenta, o la clave de una persona sin cuenta (ver clientKey). */
  key: string;
  username: string | null;
  nombre: string;
  email: string | null;
  telefono: string | null;
  programa: boolean | null;
  reservas: Reserva[];
  coincidencias: number;
  plazas: number;
  importe: number;
  /** Su próxima reserva confirmada, o null si no tiene ninguna por delante. */
  proxima: Reserva | null;
  revision: number;
  /** Para su ficha: las iniciales, sus próximas (hasta tres) y lo que hay que hacer con él. */
  iniciales: string;
  proximas: Reserva[];
  totalProximas: number;
  porCobrar: number;
  pagosPendientes: number;
  porDevolver: number;
}

/** «Amara Okafor» → «AO»; «Marta» → «M». */
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');

/** Una sesión, con todas sus reservas y su registro de asistencia. */
interface SessionGroup {
  idEvento: number;
  nombre: string;
  primera: Reserva;
  aforo: number | null;
  reservas: Reserva[];
  coincidencias: number;
  plazas: number;
  registrados: number;
  revision: number;
  /** Para su ficha: lo de la sesión que la fila no dice, lo pendiente y sus últimas reservas. */
  lugar: string;
  minimo: number | null;
  dentro: number;
  porCobrar: number;
  pagosPendientes: number;
  porDevolver: number;
  recientes: Reserva[];
}

/** Lo pendiente de un grupo de reservas, para las fichas de cliente y de sesión. */
function pendingOf(reservas: Reserva[]): { porCobrar: number; pagosPendientes: number; porDevolver: number } {
  const vivas = reservas.filter(holds);
  return {
    porCobrar: vivas
      .filter((r) => r.estadoPago === 'EN_TAQUILLA' && r.estadoEvento === 'ACTIVO')
      .reduce((sum, r) => sum + Number(r.precioVenta), 0),
    pagosPendientes: vivas.filter((r) => r.estadoPago === 'PENDIENTE').length,
    porDevolver: reservas
      .flatMap((r) => r.devoluciones ?? [])
      .filter((devolucion) => devolucion.estado === 'PENDIENTE')
      .reduce((sum, devolucion) => sum + Number(devolucion.importe), 0),
  };
}

type ClientSortKey = 'cliente' | 'reservas' | 'plazas' | 'importe' | 'proxima';
type SessionSortKey = 'sesion' | 'fecha' | 'plazas' | 'reservas' | 'registro' | 'revision';

const whenOf = (reserva: Reserva | null) =>
  reserva ? reserva.fechaInicioEvento + reserva.horaInicioEvento : '9999';

const CLIENT_COMPARE: Record<ClientSortKey, (a: ClientGroup, b: ClientGroup) => number> = {
  cliente: (a, b) => byText(a.nombre, b.nombre),
  reservas: (a, b) => a.reservas.length - b.reservas.length,
  plazas: (a, b) => a.plazas - b.plazas,
  importe: (a, b) => a.importe - b.importe,
  proxima: (a, b) => whenOf(a.proxima).localeCompare(whenOf(b.proxima)),
};

const SESSION_COMPARE: Record<SessionSortKey, (a: SessionGroup, b: SessionGroup) => number> = {
  sesion: (a, b) => byText(a.nombre, b.nombre),
  fecha: (a, b) => whenOf(a.primera).localeCompare(whenOf(b.primera)),
  plazas: (a, b) => a.plazas - b.plazas,
  reservas: (a, b) => a.reservas.length - b.reservas.length,
  registro: (a, b) => a.registrados / (a.plazas || 1) - b.registrados / (b.plazas || 1),
  revision: (a, b) => a.revision - b.revision,
};

/**
 * Reservas de todas las cuentas, en una tabla que se ordena y se filtra por estado; cada fila se
 * despliega con su ficha. Buscar por cliente, por teléfono o por participante, dar de alta una a mano
 * (por teléfono, por ejemplo), editarla entera en un diálogo y cancelarla. Las reglas de aforo y de
 * diez plazas son las del servidor.
 * Se puede llegar filtrada desde Sesiones (?sesion=) o desde Usuarios (?cuenta=). Las mismas reservas
 * se miran por reserva, por cliente o por sesión (?ver=): cada vista responde a una pregunta distinta.
 */
@Component({
  selector: 'app-admin-reservations-panel',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    PanelDialogComponent,
    ReservationEditorComponent,
    KeepHeightDirective,
    DemoFootComponent,
    FilterBarComponent,
  ],
  templateUrl: './admin-reservations-panel.component.html',
  styleUrl: '../../../shared/panel/panel.css',
})
export class AdminReservationsPanelComponent implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly summary = inject(AdminSummaryService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly reservations = signal<Reserva[]>([]);
  readonly sessions = signal<EventoAdmin[]>([]);
  readonly users = signal<Usuario[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly notice = signal<{ text: string; error: boolean } | null>(null);
  readonly busy = signal<number | null>(null);

  /**
   * Los filtros, tal como están en la dirección (?estado=canceladas&pago=taquilla…): la barra los cambia
   * navegando y aquí se leen. Así un filtro se guarda como marcador o se manda a otra persona.
   */
  readonly filterValues = signal<FilterValues>({ ...FILTER_DEFAULTS });
  readonly filterDefaults = FILTER_DEFAULTS;
  readonly query = computed(() => this.filterValues()['q'] ?? '');
  /** 0: todas las sesiones. */
  readonly sessionFilter = computed(() => Number(this.filterValues()['sesion']) || 0);
  /** Para que KeepHeight sepa que la lista ha cambiado por un filtro. */
  readonly filterKey = computed(() => JSON.stringify(this.filterValues()));

  /** Las de la sesión elegida (o todas) que coinciden con la búsqueda, antes de los demás filtros. */
  private readonly searched = computed(() => {
    const idEvento = this.sessionFilter();
    const query = this.query();
    const users = new Map(this.users().map((user) => [user.username, user]));
    return this.reservations().filter(
      (reserva) =>
        (!idEvento || reserva.idEvento === idEvento) &&
        matches(
          query,
          this.number(reserva),
          reserva.nombreCliente,
          reserva.username,
          reserva.nombreEvento,
          reserva.observaciones,
          reserva.telefono,
          reserva.telefono?.replace(/\D/g, ''),
          reserva.username ? users.get(reserva.username)?.email : reserva.clienteCorreo,
          ...reserva.asistentes.map((persona) => persona.nombre),
        ),
    );
  });

  /** Los campos del panel de filtros. */
  readonly filterFields = computed<FilterField[]>(() => [
    { key: 'q', label: 'Buscar', type: 'text', placeholder: 'Localizador, nombre, correo, teléfono o participante' },
    {
      key: 'sesion',
      label: 'Sesión',
      type: 'select',
      options: [
        { value: '', label: 'Todas las sesiones' },
        ...this.sessions().map((session) => ({
          value: String(session.idEvento),
          label: `${session.nombre} · ${formatDay(session.fechaInicio)}`,
        })),
      ],
    },
    ...dateFields('Fecha de la sesión'),
    {
      key: 'estado',
      label: 'Estado',
      type: 'select',
      options: [
        { value: 'vivas', label: 'Vivas (sin canceladas ni archivadas)' },
        { value: 'confirmadas', label: 'Confirmadas' },
        { value: 'sesion-cancelada', label: 'De sesiones canceladas' },
        { value: 'celebradas', label: 'Celebradas' },
        { value: 'canceladas', label: 'Canceladas' },
        { value: 'archivadas', label: 'Archivadas' },
        { value: 'todas', label: 'Todas, también canceladas y archivadas' },
      ],
    },
    {
      key: 'pago',
      label: 'Pago',
      type: 'select',
      options: [
        { value: '', label: 'Cualquiera' },
        { value: 'pendiente', label: 'Pendiente de pago con tarjeta' },
        { value: 'tarjeta', label: 'Pagada con tarjeta' },
        { value: 'taquilla', label: 'Por cobrar en taquilla' },
        { value: 'cobrada', label: 'Cobrada en taquilla' },
        { value: 'devolver', label: 'Con devolución por entregar' },
      ],
    },
    {
      key: 'revision',
      label: 'Adaptaciones y material',
      type: 'select',
      options: [
        { value: '', label: 'Cualquiera' },
        { value: 'alguna', label: 'Con adaptaciones o material' },
        { value: 'pendiente', label: 'Requieren revisión' },
        { value: 'aceptada', label: 'Aceptadas' },
        { value: 'no-aceptada', label: 'No aceptadas' },
      ],
    },
    {
      key: 'cliente',
      label: 'Cliente',
      type: 'select',
      options: [
        { value: '', label: 'Con o sin cuenta' },
        { value: 'con-cuenta', label: 'Con cuenta' },
        { value: 'sin-cuenta', label: 'Sin cuenta (por teléfono)' },
      ],
    },
  ]);

  /** Lo de todos los días, con cuántas hay ahora mismo (de todas las sesiones, sin la búsqueda). */
  readonly filterPresets = computed<FilterPreset[]>(() => {
    const presets: FilterPreset[] = [
      { label: 'Hoy', values: { fecha: 'hoy' } },
      { label: 'Próximos 7 días', values: { fecha: 'semana' } },
      { label: 'Por cobrar en taquilla', values: { pago: 'taquilla' } },
      { label: 'Pagos con tarjeta pendientes', values: { pago: 'pendiente' } },
      { label: 'Requieren revisión', values: { revision: 'pendiente' } },
      { label: 'Devoluciones por entregar', values: { pago: 'devolver', estado: 'todas' } },
      { label: 'Canceladas', values: { estado: 'canceladas' } },
      { label: 'Archivadas', values: { estado: 'archivadas' } },
    ];
    const all = this.reservations();
    return presets.map((preset) => ({
      ...preset,
      count: all.filter((reserva) => passes(reserva, { ...FILTER_DEFAULTS, ...preset.values })).length,
    }));
  });

  /** Aplicar filtros es navegar: la dirección cambia, la vista no se mueve, y se lee de vuelta en ngOnInit. */
  applyFilters(values: FilterValues, extra: Record<string, string | null> = {}): void {
    this.stay.set(null);
    const queryParams: Record<string, string | null> = { cuenta: null, ...extra };
    for (const key of Object.keys(FILTER_DEFAULTS)) {
      const value = values[key] ?? '';
      queryParams[key] = value === FILTER_DEFAULTS[key] ? null : value;
    }
    this.go(queryParams);
  }

  /** El orden de la tabla: por la fecha de la sesión, de la más próxima a la más lejana. */
  readonly sort = new TableSort<SortKey>('fecha');

  /** Las mismas ordenaciones, para el selector de móvil. */
  readonly sortOptions: { value: string; label: string }[] = [
    { value: 'fecha:1', label: 'Fecha, la más próxima primero' },
    { value: 'fecha:-1', label: 'Fecha, la más lejana primero' },
    { value: 'numero:-1', label: 'Nº, las más recientes primero' },
    { value: 'numero:1', label: 'Nº, las más antiguas primero' },
    { value: 'cliente:1', label: 'Cliente, de la A a la Z' },
    { value: 'sesion:1', label: 'Sesión, de la A a la Z' },
    { value: 'plazas:-1', label: 'Más plazas primero' },
    { value: 'estado:1', label: 'Estado: confirmadas primero' },
  ];

  readonly visible = computed(() => {
    const values = this.filterValues();
    const { key, dir } = this.sort.state();
    const compare = COMPARE[key];
    const stay = this.stay();
    return this.searched()
      .filter((reserva) => {
        if (reserva.idReserva === stay) {
          return true;
        }
        return passes(reserva, values);
      })
      .sort((a, b) => dir * compare(a, b) || COMPARE.fecha(a, b) || a.idReserva - b.idReserva);
  });

  readonly totals = computed(() => {
    const list = this.visible().filter(holds);
    return {
      plazas: list.reduce((sum, reserva) => sum + reserva.cantidad, 0),
      importe: list.reduce((sum, reserva) => sum + Number(reserva.precioVenta), 0),
    };
  });

  // Ver por: reserva, cliente o sesión. Los filtros y la búsqueda valen para las tres.
  readonly views = VIEWS;
  readonly view = signal<View>('reservas');
  readonly expandedClient = signal<string | null>(null);
  readonly expandedSession = signal<number | null>(null);
  readonly clientSort = new TableSort<ClientSortKey>('proxima');
  readonly sessionSort = new TableSort<SessionSortKey>('fecha');

  readonly clientSortOptions = [
    { value: 'proxima:1', label: 'Próxima sesión, la más cercana primero' },
    { value: 'cliente:1', label: 'Cliente, de la A a la Z' },
    { value: 'reservas:-1', label: 'Más reservas primero' },
    { value: 'plazas:-1', label: 'Más plazas primero' },
    { value: 'importe:-1', label: 'Mayor importe primero' },
  ];

  readonly sessionSortOptions = [
    { value: 'fecha:1', label: 'Fecha, la más próxima primero' },
    { value: 'sesion:1', label: 'Sesión, de la A a la Z' },
    { value: 'plazas:-1', label: 'Más plazas reservadas primero' },
    { value: 'registro:1', label: 'Menos registradas primero' },
    { value: 'revision:-1', label: 'Más pendientes de revisión primero' },
  ];

  readonly clients = computed<ClientGroup[]>(() => {
    const users = new Map(this.users().map((user) => [user.username, user]));
    const groups = new Map<string, Reserva[]>();
    const matching = new Set(this.visible().map((reserva) => reserva.idReserva));
    for (const reserva of this.reservations()) {
      groups.set(clientKey(reserva), [...(groups.get(clientKey(reserva)) ?? []), reserva]);
    }
    const { key, dir } = this.clientSort.state();
    return [...groups.entries()]
      .map(([clave, reservas]) => {
        const username = reservas[0].username;
        const user = username ? users.get(username) : undefined;
        const ordered = [...reservas].sort(COMPARE.fecha);
        const vivas = reservas.filter(holds);
        const telefono = [...reservas].sort((a, b) => b.idReserva - a.idReserva).find((r) => r.telefono)?.telefono;
        return {
          key: clave,
          username,
          nombre: reservas[0].nombreCliente,
          email: user?.email ?? reservas.find((r) => r.clienteCorreo)?.clienteCorreo ?? null,
          telefono: telefono ?? null,
          programa: user ? !!user.aceptaComunicaciones : null,
          reservas: ordered,
          coincidencias: reservas.filter((r) => matching.has(r.idReserva)).length,
          plazas: vivas.reduce((sum, r) => sum + r.cantidad, 0),
          importe: vivas.reduce((sum, r) => sum + Number(r.precioVenta), 0),
          proxima: ordered.find((r) => r.estadoEvento === 'ACTIVO' && holds(r)) ?? null,
          revision: vivas.filter((r) => r.requiereRevision).length,
          iniciales: initials(reservas[0].nombreCliente),
          ...this.upcoming(ordered),
          ...pendingOf(reservas),
        };
      })
      .filter((group) => group.coincidencias > 0)
      .sort((a, b) => dir * CLIENT_COMPARE[key](a, b) || byText(a.nombre, b.nombre));
  });

  readonly sessionGroups = computed<SessionGroup[]>(() => {
    const sessions = new Map(this.sessions().map((session) => [session.idEvento, session]));
    const groups = new Map<number, Reserva[]>();
    const matching = new Set(this.visible().map((reserva) => reserva.idReserva));
    for (const reserva of this.reservations()) {
      groups.set(reserva.idEvento, [...(groups.get(reserva.idEvento) ?? []), reserva]);
    }
    const { key, dir } = this.sessionSort.state();
    return [...groups.entries()]
      .map(([idEvento, reservas]) => {
        const ordered = [...reservas].sort((a, b) => a.idReserva - b.idReserva);
        const vivas = reservas.filter(holds);
        return {
          idEvento,
          nombre: ordered[0].nombreEvento,
          primera: ordered[0],
          aforo: sessions.get(idEvento)?.aforoMaximo ?? null,
          reservas: ordered,
          coincidencias: reservas.filter((r) => matching.has(r.idReserva)).length,
          plazas: vivas.reduce((sum, r) => sum + r.cantidad, 0),
          registrados: vivas.reduce((sum, r) => sum + r.asistentes.length, 0),
          revision: vivas.filter((r) => r.requiereRevision).length,
          lugar: sessions.get(idEvento)?.direccion ?? '',
          minimo: sessions.get(idEvento)?.minimoAsistencia ?? null,
          dentro: vivas.reduce(
            (sum, r) =>
              sum + (r.asistentes.length ? r.asistentes.filter((a) => a.entradaEn).length : r.entradasSinRegistrar),
            0,
          ),
          ...pendingOf(reservas),
          recientes: [...vivas].sort((a, b) => b.idReserva - a.idReserva).slice(0, 4),
        };
      })
      .filter((group) => group.coincidencias > 0)
      .sort((a, b) => dir * SESSION_COMPARE[key](a, b) || SESSION_COMPARE.fecha(a, b));
  });

  /** Lo que tiene por delante: vivas, de sesiones activas, de hoy en adelante; las tres primeras para la ficha. */
  private upcoming(ordered: Reserva[]): { proximas: Reserva[]; totalProximas: number } {
    const today = isoDay(new Date());
    const list = ordered.filter((r) => holds(r) && r.estadoEvento === 'ACTIVO' && r.fechaInicioEvento >= today);
    return { proximas: list.slice(0, 3), totalProximas: list.length };
  }

  /** «Nueva reserva» desde la ficha de una sesión: el diálogo, con la sesión ya elegida. */
  openNewForSession(idEvento: number): void {
    this.form = emptyForm(idEvento);
    this.formError.set(null);
    this.formErrors.set({});
    this.dialog().open();
  }

  readonly sessionStateOf = sessionState;

  /** «Nueva reserva» desde la ficha de un cliente: el diálogo, con él ya puesto (con cuenta o sin ella). */
  openNewFor(client: ClientGroup): void {
    this.form = emptyForm(this.sessionFilter() || null);
    if (client.username) {
      this.form.username = client.username;
    } else {
      this.form.sinCuenta = true;
      this.form.nombre = client.nombre;
      this.form.telefono = client.telefono ?? '';
      this.form.correo = client.email ?? '';
    }
    this.formError.set(null);
    this.formErrors.set({});
    this.dialog().open();
  }

  /** Todas sus reservas, una por una: la vista por reserva, buscándolo, con canceladas y archivadas. */
  showClientReservations(client: ClientGroup): void {
    this.expanded.set(null);
    this.view.set('reservas');
    this.applyFilters(
      { ...FILTER_DEFAULTS, q: client.username ?? client.telefono ?? client.nombre, estado: 'todas' },
      { ver: null },
    );
    afterNextRender(() => this.showTable(), { injector: this.injector });
  }

  /** Cambiar de vista no es cambiar de página: va en la dirección (?ver=) y la vista no se mueve. */
  setView(view: View): void {
    this.view.set(view);
    this.go({ ver: view === 'reservas' ? null : view });
  }

  /** Una sola navegación para cambiar la vista y el filtro de sesión a la vez, sin mover la vista. */
  private go(queryParams: Record<string, string | number | null>): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true,
      scroll: 'manual',
    });
  }

  /** Las demás reservas de su cliente, entre todas (no solo las que pasan los filtros). */
  otherReservations(reserva: Reserva): number {
    return this.reservations().filter((r) => clientKey(r) === clientKey(reserva) && r.idReserva !== reserva.idReserva)
      .length;
  }

  /** De una reserva a su cliente: la vista por cliente, sin filtros que le escondan reservas, con su ficha abierta. */
  openClient(username: string): void {
    this.clearFilters();
    this.expandedClient.set(username);
    this.view.set('clientes');
    this.go({ ver: 'clientes', sesion: null });
    this.reveal(`client-detail-${username}`);
  }

  /** La reserva desplegada: su ficha y sus acciones, debajo de su fila. Una cada vez. */
  readonly expanded = signal<number | null>(null);
  /** Lo que acaba de pasarle a una reserva, dicho en su ficha y no arriba del todo, fuera de la vista. */
  readonly rowNotice = signal<{ id: number; text: string } | null>(null);
  /** Una reserva recién cancelada sigue en su sitio hasta que se cambie de filtro, para no saltar. */
  readonly stay = signal<number | null>(null);

  /** De un cliente o una sesión a una reserva concreta: la vista por reserva, con su ficha abierta. */
  openReservation(reserva: Reserva): void {
    this.clearFilters();
    this.expanded.set(reserva.idReserva);
    this.rowNotice.set(null);
    this.view.set('reservas');
    this.go({ ver: null, sesion: null });
    this.reveal(`reservation-detail-${reserva.idReserva}`);
  }

  readonly editor = viewChild.required(ReservationEditorComponent);
  readonly saveData = (idReserva: number, datos: ReservaEditar) => this.admin.editarReserva(idReserva, datos);

  place(reserva: Reserva): string {
    return this.sessions().find((session) => session.idEvento === reserva.idEvento)?.direccion || 'Sin indicar';
  }

  /**
   * Tras editar: la reserva al día en la lista y en su ficha, que sigue desplegada. Si cambió de sesión o de
   * plazas, la ocupación de las sesiones y las cifras de la cabecera también.
   */
  afterEdit(updated: Reserva): void {
    const before = this.reservations().find((reserva) => reserva.idReserva === updated.idReserva);
    this.reservations.update((list) => list.map((reserva) => (reserva.idReserva === updated.idReserva ? updated : reserva)));
    this.rowNotice.set({ id: updated.idReserva, text: 'Cambios guardados.' });
    if (before && (before.idEvento !== updated.idEvento || before.cantidad !== updated.cantidad)) {
      this.admin.getEventos().subscribe((sessions) => this.sessions.set(sessions));
      this.summary.refresh();
    }
  }

  /** De una sesión a sus reservas, una por una: la vista por reserva filtrada por esa sesión. */
  openSessionReservations(idEvento: number): void {
    this.stay.set(null);
    this.expanded.set(null);
    this.view.set('reservas');
    this.filterValues.set({ ...FILTER_DEFAULTS, sesion: String(idEvento) });
    this.applyFilters(this.filterValues(), { ver: null });
  }

  toggleClient(username: string): void {
    const value = this.expandedClient() === username ? null : username;
    this.expandedClient.set(value);
    if (value) {
      this.reveal(`client-detail-${value}`, 'nearest');
    }
  }

  toggleSession(idEvento: number): void {
    const value = this.expandedSession() === idEvento ? null : idEvento;
    this.expandedSession.set(value);
    if (value !== null) {
      this.reveal(`session-group-${value}`, 'nearest');
    }
  }

  /** Sin filtros que escondan nada (el de sesión lo quita la navegación que viene después). */
  private clearFilters(): void {
    this.stay.set(null);
    this.filterValues.set({ ...FILTER_DEFAULTS });
  }

  /**
   * Tras pintarse, lleva la vista hasta una ficha: al desplegarla, lo justo para verla entera sin perder su
   * fila; al llegar desde otra vista, con su fila arriba (ver reveal-row).
   */
  private reveal(id: string, mode: 'nearest' | 'top' = 'top'): void {
    afterNextRender(
      () => {
        const detail = document.getElementById(id);
        if (mode === 'top') {
          revealAtTop(detail);
        } else {
          revealExpanded(detail);
        }
      },
      { injector: this.injector },
    );
  }

  /** Solo se reserva en sesiones activas. */
  readonly openSessions = computed(() => this.sessions().filter((session) => session.estado === 'ACTIVO'));

  // Alta manual, en el diálogo.
  readonly dialog = viewChild.required<PanelDialogComponent>('createDialog');
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  readonly formErrors = signal<Record<string, string>>({});
  form = emptyForm();

  readonly state = reservationState;
  readonly clientKey = clientKey;
  readonly cancellation = (reserva: Reserva) => cancellationLine(reserva);
  readonly payment = paymentBadge;
  readonly paymentText = paymentLine;
  readonly review = reviewLabel;
  readonly day = formatDay;
  readonly when = reservationWhen;
  readonly dayTime = formatDayTime;
  readonly credential = credentialLabel;
  readonly initialsOf = initials;

  /** «05 dic»: en las listas cortas de las fichas, el año solo si no es este (ver otherYear). */
  shortDay(isoDate: string): string {
    return formatDay(isoDate).replace(/ \d{4}$/, '');
  }

  /** El día y el mes de la hoja de calendario de una ficha de sesión: «05» y «dic». */
  dayNumber(isoDate: string): string {
    return isoDate.slice(8, 10);
  }

  monthShort(isoDate: string): string {
    return this.shortDay(isoDate).split(' ')[1] ?? '';
  }

  otherYear(isoDate: string): string {
    const year = isoDate.slice(0, 4);
    return year === String(new Date().getFullYear()) ? '' : ` · ${year}`;
  }

  /** La hora de empezar (19:15), para las listas cortas de las fichas. */
  startTime(reserva: Reserva): string {
    return reserva.horaInicioEvento?.slice(0, 5) ?? '';
  }

  readonly schedule = (reserva: Reserva) =>
    sessionSchedule({ horaInicio: reserva.horaInicioEvento, duracion: reserva.duracionEvento });

  /** El número de la reserva, con cuatro cifras como mínimo (0007, 0012...). */
  number(reserva: Reserva): string {
    return String(reserva.idReserva).padStart(4, '0');
  }

  seatPrice(reserva: Reserva): number {
    return reserva.cantidad ? Number(reserva.precioVenta) / reserva.cantidad : 0;
  }

  /** Despliega la ficha de la reserva, o la recoge; al desplegar, la vista baja lo justo para verla entera. */
  toggle(reserva: Reserva): void {
    const id = this.expanded() === reserva.idReserva ? null : reserva.idReserva;
    this.expanded.set(id);
    this.rowNotice.set(null);
    if (id !== null) {
      this.reveal(`reservation-detail-${id}`, 'nearest');
    }
  }

  /** Tras añadir reservas demo desde el pie: la lista y las cifras de la cabecera. */
  afterDemo(): void {
    this.summary.refresh();
    this.load();
  }
  readonly money = formatMoney;
  readonly plural = plural;
  readonly profile = profileLabel;
  readonly maxPlazas = MAX_PLAZAS;

  ngOnInit(): void {
    // Los filtros siguen a la dirección. Desde Usuarios llega ?cuenta=, que es buscar esa cuenta.
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const values: FilterValues = { ...FILTER_DEFAULTS };
      for (const key of Object.keys(FILTER_DEFAULTS)) {
        values[key] = params.get(key) ?? FILTER_DEFAULTS[key];
      }
      values['q'] = params.get('q') ?? params.get('cuenta') ?? '';
      this.filterValues.set(values);
      const view = params.get('ver');
      this.view.set(view === 'clientes' || view === 'sesiones' ? view : 'reservas');
    });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(false);
    forkJoin({
      reservations: this.admin.getReservas(),
      sessions: this.admin.getEventos(),
      users: this.admin.getUsuarios(),
    }).subscribe({
      next: ({ reservations, sessions, users }) => {
        const first = !this.reservations().length;
        this.reservations.set(reservations);
        this.sessions.set(sessions);
        this.users.set([...users].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')));
        this.loading.set(false);
        // Llegar ya filtrado (desde «N reservas» en Sesiones o desde Usuarios) es venir a ver esa tabla.
        if (first && (this.sessionFilter() || this.query())) {
          afterNextRender(() => this.showTable(), { injector: this.injector });
        }
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set(true);
      },
    });
  }

  /**
   * El filtro de sesión va en la dirección, para poder enlazarlo y volver a él. Cambiarlo no es cambiar
   * de página: la vista se queda donde está (scroll: 'manual', como en /sesiones).
   */
  filterBySession(idEvento: number): void {
    this.applyFilters({ ...this.filterValues(), sesion: idEvento ? String(idEvento) : '' });
  }

  /**
   * Desde la ficha abierta, ver solo las reservas de su sesión: las filas de otras sesiones se van,
   * así que la vista se corrige para que la fila abierta se quede donde estaba, bajo el cursor.
   */
  filterFromCard(reserva: Reserva): void {
    const row = () => this.host.nativeElement.querySelector<HTMLElement>(`#reservation-detail-${reserva.idReserva}`);
    const before = row()?.getBoundingClientRect().top;
    this.filterBySession(reserva.idEvento);
    afterNextRender(
      () => {
        const after = row()?.getBoundingClientRect().top;
        if (before !== undefined && after !== undefined) {
          window.scrollBy({ top: after - before, behavior: 'auto' });
        }
      },
      { injector: this.injector },
    );
  }

  /** Lleva la vista a los filtros y la tabla, por debajo de la barra fija del panel. */
  private showTable(): void {
    const toolbar = this.host.nativeElement.querySelector('.toolbar');
    if (toolbar) {
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const top = window.scrollY + toolbar.getBoundingClientRect().top - 88;
      window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
    }
  }

  /** Plazas que quedan en una sesión. */
  free(session: EventoAdmin): number {
    return Math.max(0, session.aforoMaximo - session.plazasReservadas);
  }

  selectedSession(): EventoAdmin | undefined {
    return this.sessions().find((session) => session.idEvento === this.form.idEvento);
  }

  /** Lo más que se puede pedir en la sesión elegida: 10 o lo que quede libre. */
  maxForSelected(): number {
    const session = this.selectedSession();
    return session ? Math.max(1, Math.min(MAX_PLAZAS, this.free(session))) : MAX_PLAZAS;
  }

  openNew(): void {
    this.form = emptyForm(this.sessionFilter() || null);
    this.formError.set(null);
    this.dialog().open();
  }

  save(): void {
    if (this.saving()) {
      return;
    }
    const { username, idEvento, cantidad, observaciones, sinCuenta, nombre, telefono, correo } = this.form;
    if ((!sinCuenta && !username) || !idEvento) {
      this.formError.set(sinCuenta ? 'Elige la sesión.' : 'Elige la cuenta y la sesión.');
      return;
    }
    this.saving.set(true);
    this.formError.set(null);
    this.formErrors.set({});
    const request = sinCuenta
      ? this.admin.crearReservaSinCuenta(idEvento, { nombre, telefono, correo, cantidad: cantidad ?? 0, observaciones })
      : this.admin.crearReservaParaUsuario(username, idEvento, { cantidad: cantidad ?? 0, observaciones });
    request
      .subscribe({
        next: (reserva) => {
          this.saving.set(false);
          this.dialog().close();
          this.notice.set({
            text: `Reserva ${this.number(reserva)} de ${plural(reserva.cantidad, 'plaza', 'plazas')} en «${reserva.nombreEvento}» para ${reserva.nombreCliente}.`,
            error: false,
          });
          this.load();
          this.summary.refresh();
        },
        error: (error) => {
          this.saving.set(false);
          this.formErrors.set(fieldErrors(error));
          this.formError.set(errorMessage(error, 'No se ha podido crear la reserva.'));
        },
      });
  }

  /** Quien reservó por teléfono paga al llegar: se marca aquí, sin pasar por Stripe. */
  collect(reserva: Reserva): void {
    if (this.busy() !== null) {
      return;
    }
    this.busy.set(reserva.idReserva);
    this.admin.marcarCobrada(reserva.idReserva).subscribe({
      next: (updated) => {
        this.busy.set(null);
        this.reservations.update((list) => list.map((item) => (item.idReserva === updated.idReserva ? updated : item)));
        this.rowNotice.set({ id: updated.idReserva, text: `Cobrada en taquilla: ${formatMoney(updated.precioVenta)}.` });
      },
      error: (error) => {
        this.busy.set(null);
        this.rowNotice.set({ id: reserva.idReserva, text: errorMessage(error, 'No se ha podido marcar como cobrada.') });
      },
    });
  }

  // La revisión de adaptaciones y material, en su diálogo.
  readonly reviewDialogRef = viewChild.required<PanelDialogComponent>('reviewDialog');
  readonly reviewTarget = signal<Reserva | null>(null);
  readonly reviewError = signal<string | null>(null);
  reviewAccept = true;
  reviewNote = '';

  openReview(reserva: Reserva, accept: boolean): void {
    this.reviewTarget.set(reserva);
    this.reviewAccept = accept;
    this.reviewNote = reserva.revisionNota ?? '';
    this.reviewError.set(null);
    this.reviewDialogRef().open();
  }

  saveReview(): void {
    const reserva = this.reviewTarget();
    if (!reserva || this.busy() !== null) {
      return;
    }
    if (!this.reviewAccept && !this.reviewNote.trim()) {
      this.reviewError.set('Explica al cliente por qué no se aceptan.');
      return;
    }
    this.busy.set(reserva.idReserva);
    this.admin.revisarReserva(reserva.idReserva, this.reviewAccept, this.reviewNote).subscribe({
      next: (updated) => {
        this.busy.set(null);
        this.reviewDialogRef().close();
        this.reservations.update((list) => list.map((item) => (item.idReserva === updated.idReserva ? updated : item)));
        // Sigue en su sitio aunque ya no «requiera revisión»: se suelta al cambiar de filtro.
        this.stay.set(updated.idReserva);
        this.rowNotice.set({ id: updated.idReserva, text: `Adaptaciones ${this.review(updated).toLowerCase()}.` });
      },
      error: (error) => {
        this.busy.set(null);
        this.reviewError.set(errorMessage(error, 'No se ha podido guardar la decisión.'));
      },
    });
  }

  /** Una cancelada vuelve si su sesión sigue activa y no se movió dinero (el servidor mira las plazas). */
  reactivable(reserva: Reserva): boolean {
    return (
      !!reserva.canceladaEn &&
      reserva.estadoEvento === 'ACTIVO' &&
      reserva.estadoPago !== 'PENDIENTE' &&
      Number(reserva.importeDevuelto) === 0
    );
  }

  reactivate(reserva: Reserva): void {
    if (this.busy() !== null) {
      return;
    }
    this.busy.set(reserva.idReserva);
    this.admin.reactivarReserva(reserva.idReserva).subscribe({
      next: (updated) => {
        this.busy.set(null);
        this.stay.set(updated.idReserva);
        this.reservations.update((list) => list.map((item) => (item.idReserva === updated.idReserva ? updated : item)));
        this.sessions.update((list) =>
          list.map((session) =>
            session.idEvento === updated.idEvento
              ? { ...session, plazasReservadas: session.plazasReservadas + updated.cantidad, reservas: session.reservas + 1 }
              : session,
          ),
        );
        this.rowNotice.set({ id: updated.idReserva, text: 'Reserva reactivada: vuelve a ocupar sus plazas.' });
        this.summary.refresh();
      },
      error: (error) => {
        this.busy.set(null);
        this.rowNotice.set({ id: reserva.idReserva, text: errorMessage(error, 'No se ha podido reactivar.') });
      },
    });
  }

  /** El dinero de una devolución en taquilla ya se ha entregado. */
  handOver(reserva: Reserva, idDevolucion: number): void {
    if (this.busy() !== null) {
      return;
    }
    this.busy.set(reserva.idReserva);
    this.admin.entregarDevolucion(reserva.idReserva, idDevolucion).subscribe({
      next: (updated) => {
        this.busy.set(null);
        this.reservations.update((list) => list.map((item) => (item.idReserva === updated.idReserva ? updated : item)));
        this.rowNotice.set({ id: updated.idReserva, text: 'Devolución entregada.' });
      },
      error: (error) => {
        this.busy.set(null);
        this.rowNotice.set({ id: reserva.idReserva, text: errorMessage(error, 'No se ha podido marcar.') });
      },
    });
  }

  // Cancelar, en su diálogo: desde el panel siempre con motivo, que verá también el cliente.
  readonly cancelDialog = viewChild.required<PanelDialogComponent>('cancelDialog');
  readonly cancelTarget = signal<Reserva | null>(null);
  readonly cancelError = signal<string | null>(null);
  cancelReason = '';
  /** Lo cobrado se devuelve salvo que se desmarque (una duplicada cuyo pago vale para la otra). */
  cancelRefund = true;

  /** Lo que se devolvería al cancelar: lo cobrado que aún no se ha devuelto. */
  refundable(reserva: Reserva): number {
    const cobrada = reserva.estadoPago === 'PAGADA' || reserva.estadoPago === 'COBRADA_TAQUILLA';
    return cobrada ? Math.max(0, Number(reserva.precioVenta) - Number(reserva.importeDevuelto)) : 0;
  }

  cancel(reserva: Reserva): void {
    this.cancelTarget.set(reserva);
    this.cancelReason = '';
    this.cancelRefund = true;
    this.cancelError.set(null);
    this.cancelDialog().open();
  }

  /**
   * La reserva no se borra: vuelve cancelada, libera sus plazas y se queda en su fila, desplegada, hasta
   * que se cambie de filtro; luego está en «Canceladas».
   */
  confirmCancel(): void {
    const reserva = this.cancelTarget();
    if (!reserva || this.busy() !== null) {
      return;
    }
    if (!this.cancelReason.trim()) {
      this.cancelError.set('Indica el motivo de la cancelación.');
      return;
    }
    this.busy.set(reserva.idReserva);
    this.cancelError.set(null);
    this.admin.cancelarReservaAdmin(reserva.idReserva, this.cancelReason, this.cancelRefund).subscribe({
      next: (updated) => {
        this.busy.set(null);
        this.cancelDialog().close();
        this.stay.set(updated.idReserva);
        this.reservations.update((list) => list.map((item) => (item.idReserva === updated.idReserva ? updated : item)));
        this.sessions.update((list) =>
          list.map((session) =>
            session.idEvento === reserva.idEvento
              ? {
                  ...session,
                  plazasReservadas: session.plazasReservadas - reserva.cantidad,
                  reservas: session.reservas - 1,
                }
              : session,
          ),
        );
        const devuelto = Number(updated.importeDevuelto) - Number(reserva.importeDevuelto);
        const enTaquilla = updated.estadoPago === 'COBRADA_TAQUILLA';
        this.rowNotice.set({
          id: updated.idReserva,
          text:
            devuelto <= 0
              ? 'Reserva cancelada. Ahora está en «Canceladas».'
              : enTaquilla
                ? `Reserva cancelada: ${formatMoney(devuelto)} por devolver en taquilla. Márcalo al entregarlo.`
                : `Reserva cancelada y ${formatMoney(devuelto)} devueltos a su tarjeta. Ahora está en «Canceladas».`,
        });
        this.summary.refresh();
      },
      error: (error) => {
        this.busy.set(null);
        this.cancelError.set(errorMessage(error, 'No se ha podido cancelar la reserva.'));
      },
    });
  }
}

function emptyForm(idEvento: number | null = null) {
  return {
    username: '',
    /** Por teléfono, a alguien sin cuenta: entonces cuentan nombre, teléfono y correo. */
    sinCuenta: false,
    nombre: '',
    telefono: '',
    correo: '',
    idEvento,
    cantidad: 1 as number | null,
    observaciones: '',
  };
}
