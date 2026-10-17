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
import { PanelConfirmService } from '../../../shared/panel/panel-confirm';
import { PanelDialogComponent } from '../../../shared/panel/panel-dialog.component';
import { ReservationEditorComponent } from '../../../shared/panel/reservation-editor.component';
import {
  errorMessage,
  formatDay,
  formatDayTime,
  reservationWhen,
  formatMoney,
  matches,
  plural,
  profileLabel,
  reservationState,
} from '../../../shared/panel/panel-format';
import { TableSort } from '../../../shared/panel/table-sort';
import { KeepHeightDirective } from '../../../shared/keep-height/keep-height.directive';
import { AdminSummaryService } from '../admin-summary.service';
import { DemoFootComponent } from '../demo-foot.component';

/** Una reserva admite de 1 a 10 plazas, y nadie pasa de 10 en la misma sesión (lo comprueba el servidor). */
const MAX_PLAZAS = 10;

/** Por el estado de su sesión (confirmadas, de sesión cancelada o celebradas), o las que requieren revisión. */
type Filter = 'TODAS' | EstadoEvento | 'REVISION';

/** Columnas por las que se ordena la tabla. */
type SortKey = 'numero' | 'cliente' | 'sesion' | 'fecha' | 'plazas' | 'estado';

/** Al ordenar por estado: las confirmadas, las de sesión cancelada, las celebradas. */
const STATE_ORDER: Record<EstadoEvento, number> = { ACTIVO: 0, CANCELADO: 1, TERMINADO: 2 };

const byText = (a: string, b: string) => a.localeCompare(b, 'es', { sensitivity: 'base' });

const COMPARE: Record<SortKey, (a: Reserva, b: Reserva) => number> = {
  numero: (a, b) => a.idReserva - b.idReserva,
  cliente: (a, b) => byText(a.nombreCliente, b.nombreCliente),
  sesion: (a, b) => byText(a.nombreEvento, b.nombreEvento),
  fecha: (a, b) =>
    (a.fechaInicioEvento + a.horaInicioEvento).localeCompare(b.fechaInicioEvento + b.horaInicioEvento),
  plazas: (a, b) => a.cantidad - b.cantidad,
  estado: (a, b) => STATE_ORDER[a.estadoEvento as EstadoEvento] - STATE_ORDER[b.estadoEvento as EstadoEvento],
};

/** Las tres preguntas del panel: qué pasa con una reserva, quién es un cliente, cómo va una sesión. */
type View = 'reservas' | 'clientes' | 'sesiones';

const VIEWS: { value: View; label: string }[] = [
  { value: 'reservas', label: 'Reserva' },
  { value: 'clientes', label: 'Cliente' },
  { value: 'sesiones', label: 'Sesión' },
];

/** Un cliente, con todas sus reservas y lo que suman. */
interface ClientGroup {
  username: string;
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
}

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
  imports: [FormsModule, RouterLink, PanelDialogComponent, ReservationEditorComponent, KeepHeightDirective, DemoFootComponent],
  templateUrl: './admin-reservations-panel.component.html',
  styleUrl: '../../../shared/panel/panel.css',
})
export class AdminReservationsPanelComponent implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly confirm = inject(PanelConfirmService);
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

  readonly query = signal('');
  /** 0: todas las sesiones. */
  readonly sessionFilter = signal(0);

  readonly filter = signal<Filter>('TODAS');

  /** Las de la sesión elegida (o todas) que coinciden con la búsqueda, antes de filtrar por estado. */
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
          users.get(reserva.username)?.email,
          ...reserva.asistentes.map((persona) => persona.nombre),
        ),
    );
  });

  readonly filters = computed(() => {
    const list = this.searched();
    const count = (estado: EstadoEvento) => list.filter((reserva) => reserva.estadoEvento === estado).length;
    return [
      { value: 'TODAS' as Filter, label: 'Todas', count: list.length },
      { value: 'ACTIVO' as Filter, label: 'Confirmadas', count: count('ACTIVO') },
      { value: 'CANCELADO' as Filter, label: 'Sesión cancelada', count: count('CANCELADO') },
      { value: 'TERMINADO' as Filter, label: 'Celebradas', count: count('TERMINADO') },
      {
        value: 'REVISION' as Filter,
        label: 'Requieren revisión',
        count: list.filter((reserva) => reserva.requiereRevision).length,
      },
    ];
  });

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
    const filter = this.filter();
    const { key, dir } = this.sort.state();
    const compare = COMPARE[key];
    return this.searched()
      .filter((reserva) =>
        filter === 'TODAS' ? true : filter === 'REVISION' ? reserva.requiereRevision : reserva.estadoEvento === filter,
      )
      .sort((a, b) => dir * compare(a, b) || COMPARE.fecha(a, b) || a.idReserva - b.idReserva);
  });

  readonly totals = computed(() => {
    const list = this.visible();
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
      groups.set(reserva.username, [...(groups.get(reserva.username) ?? []), reserva]);
    }
    const { key, dir } = this.clientSort.state();
    return [...groups.entries()]
      .map(([username, reservas]) => {
        const user = users.get(username);
        const ordered = [...reservas].sort(COMPARE.fecha);
        const telefono = [...reservas].sort((a, b) => b.idReserva - a.idReserva).find((r) => r.telefono)?.telefono;
        return {
          username,
          nombre: reservas[0].nombreCliente,
          email: user?.email ?? null,
          telefono: telefono ?? null,
          programa: user ? !!user.aceptaComunicaciones : null,
          reservas: ordered,
          coincidencias: reservas.filter((r) => matching.has(r.idReserva)).length,
          plazas: reservas.reduce((sum, r) => sum + r.cantidad, 0),
          importe: reservas.reduce((sum, r) => sum + Number(r.precioVenta), 0),
          proxima: ordered.find((r) => r.estadoEvento === 'ACTIVO') ?? null,
          revision: reservas.filter((r) => r.requiereRevision).length,
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
        return {
          idEvento,
          nombre: ordered[0].nombreEvento,
          primera: ordered[0],
          aforo: sessions.get(idEvento)?.aforoMaximo ?? null,
          reservas: ordered,
          coincidencias: reservas.filter((r) => matching.has(r.idReserva)).length,
          plazas: reservas.reduce((sum, r) => sum + r.cantidad, 0),
          registrados: reservas.reduce((sum, r) => sum + r.asistentes.length, 0),
          revision: reservas.filter((r) => r.requiereRevision).length,
        };
      })
      .filter((group) => group.coincidencias > 0)
      .sort((a, b) => dir * SESSION_COMPARE[key](a, b) || SESSION_COMPARE.fecha(a, b));
  });

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
    return this.reservations().filter((r) => r.username === reserva.username && r.idReserva !== reserva.idReserva)
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
  /** La reserva recién editada, para decirlo en su ficha y no arriba del todo, fuera de la vista. */
  readonly savedId = signal<number | null>(null);

  /** De un cliente o una sesión a una reserva concreta: la vista por reserva, con su ficha abierta. */
  openReservation(reserva: Reserva): void {
    this.clearFilters();
    this.expanded.set(reserva.idReserva);
    this.savedId.set(null);
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
    this.savedId.set(updated.idReserva);
    if (before && (before.idEvento !== updated.idEvento || before.cantidad !== updated.cantidad)) {
      this.admin.getEventos().subscribe((sessions) => this.sessions.set(sessions));
      this.summary.refresh();
    }
  }

  /** De una sesión a sus reservas, una por una: la vista por reserva filtrada por esa sesión. */
  openSessionReservations(idEvento: number): void {
    this.filter.set('TODAS');
    this.query.set('');
    this.expanded.set(null);
    this.view.set('reservas');
    this.sessionFilter.set(idEvento);
    this.go({ ver: null, sesion: idEvento });
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
    this.filter.set('TODAS');
    this.query.set('');
    this.sessionFilter.set(0);
  }

  /** Tras pintarse, lleva la vista hasta una ficha: entera si cabe (nearest), o al centro si viene de otra vista. */
  private reveal(id: string, block: ScrollLogicalPosition = 'center'): void {
    afterNextRender(
      () => {
        const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
        document.getElementById(id)?.scrollIntoView({ block, behavior: reduce ? 'auto' : 'smooth' });
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
  form = emptyForm();

  readonly state = reservationState;
  readonly day = formatDay;
  readonly when = reservationWhen;
  readonly dayTime = formatDayTime;
  readonly credential = credentialLabel;
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
    this.savedId.set(null);
    if (id !== null) {
      afterNextRender(
        () => {
          const detail = document.getElementById(`reservation-detail-${id}`);
          const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
          detail?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
        },
        { injector: this.injector },
      );
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
    // Desde Usuarios llega la cuenta a buscar; el filtro de sesión sigue a la dirección.
    this.query.set(this.route.snapshot.queryParamMap.get('cuenta') ?? '');
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.sessionFilter.set(Number(params.get('sesion')) || 0);
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
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { sesion: idEvento || null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
      scroll: 'manual',
    });
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
    const { username, idEvento, cantidad, observaciones } = this.form;
    if (!username || !idEvento) {
      this.formError.set('Elige la cuenta y la sesión.');
      return;
    }
    this.saving.set(true);
    this.formError.set(null);
    this.admin
      .crearReservaParaUsuario(username, idEvento, { cantidad: cantidad ?? 0, observaciones })
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
          this.formError.set(errorMessage(error, 'No se ha podido crear la reserva.'));
        },
      });
  }

  async cancel(reserva: Reserva): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: '¿Cancelar la reserva?',
      message: `Se liberan ${plural(reserva.cantidad, 'plaza', 'plazas')} de «${reserva.nombreEvento}» y la reserva desaparece del panel de ${reserva.nombreCliente}.`,
      confirm: 'Cancelar reserva',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    this.busy.set(reserva.idReserva);
    this.admin.cancelarReservaAdmin(reserva.idReserva).subscribe({
      next: () => {
        this.busy.set(null);
        this.reservations.update((list) => list.filter((item) => item.idReserva !== reserva.idReserva));
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
        this.notice.set({ text: `Reserva de ${reserva.nombreCliente} cancelada.`, error: false });
        this.summary.refresh();
      },
      error: (error) => {
        this.busy.set(null);
        this.notice.set({ text: errorMessage(error, 'No se ha podido cancelar la reserva.'), error: true });
        this.load();
      },
    });
  }
}

function emptyForm(idEvento: number | null = null) {
  return {
    username: '',
    idEvento,
    cantidad: 1 as number | null,
    observaciones: '',
  };
}
