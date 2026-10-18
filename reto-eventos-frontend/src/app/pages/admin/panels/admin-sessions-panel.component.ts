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
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, of } from 'rxjs';

import { AdminService } from '../../../core/services/admin.service';
import { archiveCode, sessionImage, sessionSchedule } from '../../../features/sessions/session.presenter';
import { EstadoEvento, EventoAdmin, EventoPayload, TipoEvento } from '../../../models/api.models';
import { PanelConfirmService } from '../../../shared/panel/panel-confirm';
import { PanelDialogComponent } from '../../../shared/panel/panel-dialog.component';
import {
  errorMessage,
  fieldErrors,
  formatDay,
  formatMoney,
  humanizeCode,
  matches,
  plural,
  sessionState,
} from '../../../shared/panel/panel-format';
import { TableSort } from '../../../shared/panel/table-sort';
import {
  dateFields,
  FilterBarComponent,
  FilterField,
  FilterPreset,
  FilterValues,
  matchesDate,
} from '../../../shared/panel/filter-bar.component';
import { KeepHeightDirective } from '../../../shared/keep-height/keep-height.directive';
import { revealExpanded } from '../../../shared/panel/reveal-row';
import { AdminSummaryService } from '../admin-summary.service';
import { DemoFootComponent } from '../demo-foot.component';
import { AdminControlSheetComponent } from './admin-control-sheet.component';
import { AdminDossierFormComponent } from './admin-dossier-form.component';
import { PREVIEW_PARAM, SessionPreview, writePreview } from '../../../features/sessions/session-preview';

/** Fotos que admite el servidor (ver ImagenSesionService). */
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

/** Los filtros y lo que valen sin filtrar: las no archivadas, de cualquier fecha, tipo y ocupación. */
const FILTER_DEFAULTS: FilterValues = { q: '', estado: 'vivas', fecha: '', desde: '', hasta: '', tipo: '', ocupacion: '' };

/**
 * Si una sesión pasa los filtros que no son de texto: estado, fecha, tipo y ocupación. Pura: la usan la
 * tabla y las cuentas de los filtros listos.
 */
function passes(session: EventoAdmin, values: FilterValues, today = new Date()): boolean {
  const estado = {
    vivas: !session.archivada,
    activas: !session.archivada && session.estado === 'ACTIVO',
    canceladas: !session.archivada && session.estado === 'CANCELADO',
    terminadas: !session.archivada && session.estado === 'TERMINADO',
    archivadas: session.archivada,
    todas: true,
  }[values['estado'] || 'vivas'];
  if (!estado || !matchesDate(session.fechaInicio, values, today)) {
    return false;
  }
  if (values['tipo'] && String(session.idTipo) !== values['tipo']) {
    return false;
  }
  const libres = session.aforoMaximo - session.plazasReservadas;
  return (
    {
      '': true,
      'sin-reservas': session.plazasReservadas === 0,
      'bajo-minimo': session.plazasReservadas < session.minimoAsistencia,
      'casi-completas': libres > 0 && session.plazasReservadas >= session.aforoMaximo * 0.8,
      completas: libres <= 0,
    }[values['ocupacion'] ?? ''] ?? true
  );
}

/** Columnas por las que se ordena la tabla. */
type SortKey = 'numero' | 'nombre' | 'fecha' | 'aforo' | 'estado';

/** Orden de los estados al ordenar por estado: lo que está en marcha, lo anulado, lo cerrado. */
const STATE_ORDER: Record<EstadoEvento, number> = { ACTIVO: 0, CANCELADO: 1, TERMINADO: 2 };

const COMPARE: Record<SortKey, (a: EventoAdmin, b: EventoAdmin) => number> = {
  numero: (a, b) => a.idEvento - b.idEvento,
  nombre: (a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }),
  fecha: (a, b) => (a.fechaInicio + a.horaInicio).localeCompare(b.fechaInicio + b.horaInicio),
  aforo: (a, b) => a.plazasReservadas - b.plazasReservadas || a.aforoMaximo - b.aforoMaximo,
  estado: (a, b) => STATE_ORDER[a.estado] - STATE_ORDER[b.estado],
};

/** Las páginas de Modificar sesión: los datos, el expediente y cómo se verá todo en la web. */
type EditPage = 'datos' | 'expediente' | 'vista';

/** El ancho de ordenador con el que se pinta la vista previa (luego se reduce para que quepa). */
const PREVIEW_DESKTOP_WIDTH = 1440;

/**
 * Sesiones: el programa, con su ocupación. Una sesión nace activa; se cancela (y se puede
 * reactivar) con sus acciones, no desde el formulario. Solo se borra la que nunca tuvo reservas: la que
 * tiene historia se cancela y se archiva, y sus reservas siguen en el panel de sus clientes.
 */
@Component({
  selector: 'app-admin-sessions-panel',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    PanelDialogComponent,
    AdminDossierFormComponent,
    KeepHeightDirective,
    DemoFootComponent,
    FilterBarComponent,
    AdminControlSheetComponent,
  ],
  templateUrl: './admin-sessions-panel.component.html',
  styleUrl: '../../../shared/panel/panel.css',
})
export class AdminSessionsPanelComponent implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly confirm = inject(PanelConfirmService);
  private readonly summary = inject(AdminSummaryService);
  private readonly injector = inject(Injector);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly sessions = signal<EventoAdmin[]>([]);
  readonly types = signal<TipoEvento[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly notice = signal<{ text: string; error: boolean } | null>(null);
  /** La sesión con una petición en curso, para no pulsar dos veces. */
  readonly busy = signal<number | null>(null);
  /** La sesión desplegada: su ficha y sus acciones, debajo de su fila. Una cada vez. */
  readonly expanded = signal<number | null>(null);

  /**
   * Los filtros, en la dirección (?estado=activas&ocupacion=bajo-minimo…): la barra los cambia navegando y
   * aquí se leen. Así un filtro se guarda como marcador o se manda a otra persona.
   */
  readonly filterValues = signal<FilterValues>({ ...FILTER_DEFAULTS });
  readonly filterDefaults = FILTER_DEFAULTS;
  readonly query = computed(() => this.filterValues()['q'] ?? '');
  /** Para que KeepHeight sepa que la lista ha cambiado por un filtro. */
  readonly filterKey = computed(() => JSON.stringify(this.filterValues()));

  readonly filterFields = computed<FilterField[]>(() => [
    { key: 'q', label: 'Buscar', type: 'text', placeholder: 'Nº, nombre, referencia, tipo o lugar' },
    {
      key: 'estado',
      label: 'Estado',
      type: 'select',
      options: [
        { value: 'vivas', label: 'Sin las archivadas' },
        { value: 'activas', label: 'Activas' },
        { value: 'canceladas', label: 'Canceladas' },
        { value: 'terminadas', label: 'Terminadas' },
        { value: 'archivadas', label: 'Archivadas' },
        { value: 'todas', label: 'Todas, también las archivadas' },
      ],
    },
    ...dateFields('Fecha'),
    {
      key: 'tipo',
      label: 'Tipo',
      type: 'select',
      options: [
        { value: '', label: 'Cualquier tipo' },
        ...this.types().map((type) => ({ value: String(type.idTipo), label: humanizeCode(type.nombre) })),
      ],
    },
    {
      key: 'ocupacion',
      label: 'Ocupación',
      type: 'select',
      options: [
        { value: '', label: 'Cualquiera' },
        { value: 'sin-reservas', label: 'Sin reservas' },
        { value: 'bajo-minimo', label: 'Por debajo del mínimo' },
        { value: 'casi-completas', label: 'Casi completas (80 % o más)' },
        { value: 'completas', label: 'Completas' },
      ],
    },
  ]);

  /** Lo de todos los días, con cuántas hay ahora mismo. */
  readonly filterPresets = computed<FilterPreset[]>(() => {
    const presets: FilterPreset[] = [
      { label: 'Hoy', values: { fecha: 'hoy' } },
      { label: 'Próximos 7 días', values: { fecha: 'semana' } },
      { label: 'Activas', values: { estado: 'activas' } },
      { label: 'Por debajo del mínimo', values: { estado: 'activas', ocupacion: 'bajo-minimo' } },
      { label: 'Casi completas', values: { ocupacion: 'casi-completas' } },
      { label: 'Sin reservas', values: { ocupacion: 'sin-reservas' } },
      { label: 'Terminadas por archivar', values: { estado: 'terminadas' } },
      { label: 'Canceladas', values: { estado: 'canceladas' } },
      { label: 'Archivadas', values: { estado: 'archivadas' } },
    ];
    const all = this.sessions();
    return presets.map((preset) => ({
      ...preset,
      count: all.filter((session) => passes(session, { ...FILTER_DEFAULTS, ...preset.values })).length,
    }));
  });

  /** Aplicar filtros es navegar sin mover la vista; la dirección se lee de vuelta en ngOnInit. */
  applyFilters(values: FilterValues): void {
    const queryParams: Record<string, string | null> = {};
    for (const key of Object.keys(FILTER_DEFAULTS)) {
      const value = values[key] ?? '';
      queryParams[key] = value === FILTER_DEFAULTS[key] ? null : value;
    }
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true,
      scroll: 'manual',
    });
  }

  /** El orden de la tabla: por fecha, de la más próxima a la más lejana, hasta que se pulse otra columna. */
  readonly sort = new TableSort<SortKey>('fecha');

  /** Las mismas ordenaciones, para el selector de móvil. */
  readonly sortOptions: { value: string; label: string }[] = [
    { value: 'fecha:1', label: 'Fecha, la más próxima primero' },
    { value: 'fecha:-1', label: 'Fecha, la más lejana primero' },
    { value: 'numero:1', label: 'Nº, de menor a mayor' },
    { value: 'numero:-1', label: 'Nº, de mayor a menor' },
    { value: 'nombre:1', label: 'Nombre, de la A a la Z' },
    { value: 'nombre:-1', label: 'Nombre, de la Z a la A' },
    { value: 'aforo:-1', label: 'Más plazas reservadas primero' },
    { value: 'aforo:1', label: 'Menos plazas reservadas primero' },
    { value: 'estado:1', label: 'Estado: activas primero' },
    { value: 'estado:-1', label: 'Estado: terminadas primero' },
  ];

  readonly visible = computed(() => {
    const values = this.filterValues();
    const query = this.query();
    const { key, dir } = this.sort.state();
    const compare = COMPARE[key];
    return this.sessions()
      .filter(
      (session) =>
        passes(session, values) &&
        matches(
          query,
          session.nombre,
          this.number(session),
          this.code(session),
          humanizeCode(session.tipoEvento),
          session.direccion,
        ),
      )
      .sort((a, b) => dir * compare(a, b) || COMPARE.fecha(a, b) || a.idEvento - b.idEvento);
  });

  /** La hoja de control de una sesión, en su diálogo. */
  readonly controlId = signal<number | null>(null);
  readonly controlDialog = viewChild.required<PanelDialogComponent>('controlDialog');

  openControl(idEvento: number): void {
    this.controlId.set(idEvento);
    this.controlDialog().open();
  }

  // Formulario de alta y edición, en el diálogo.
  readonly dialog = viewChild.required<PanelDialogComponent>('editDialog');
  readonly editing = signal<EventoAdmin | null>(null);
  /** Reactivar una sesión cuya fecha ya pasó: primero se le da otra fecha, después se reactiva. */
  readonly reactivating = signal(false);
  readonly saving = signal(false);
  readonly errors = signal<Record<string, string>>({});
  readonly formError = signal<string | null>(null);
  form: EventoPayload = emptyForm();

  // La foto, en el mismo formulario: se sube (o se quita) después de guardar los datos.
  readonly photoFile = signal<File | null>(null);
  readonly photoPreview = signal<string | null>(null);
  readonly removePhoto = signal(false);
  readonly photoError = signal<string | null>(null);

  readonly dossierForm = viewChild.required(AdminDossierFormComponent);
  readonly page = signal<EditPage>('datos');

  // La vista previa: la página pública de verdad, en un iframe, con lo que hay en el formulario.
  private readonly sanitizer = inject(DomSanitizer);
  readonly previewSrc = this.sanitizer.bypassSecurityTrustResourceUrl(`/sesiones?${PREVIEW_PARAM}=1`);
  /** El iframe se crea la primera vez que se abre la pestaña, no antes. */
  readonly previewOpened = signal(false);
  readonly previewDevice = signal<'ordenador' | 'movil'>('ordenador');
  readonly previewScale = signal(0.5);
  private readonly previewBox = viewChild<ElementRef<HTMLElement>>('previewBox');

  /** Pasa a una página del diálogo; la vista previa se pone al día con lo que hay en el formulario. */
  showPage(page: EditPage): void {
    this.page.set(page);
    if (page === 'vista') {
      writePreview(this.buildPreview());
      this.previewOpened.set(true);
      afterNextRender(() => this.fitPreview(), { injector: this.injector });
    }
  }

  setPreviewDevice(device: 'ordenador' | 'movil'): void {
    this.previewDevice.set(device);
    afterNextRender(() => this.fitPreview(), { injector: this.injector });
  }

  /** La página de ordenador, reducida hasta el ancho del diálogo. */
  private fitPreview(): void {
    const box = this.previewBox()?.nativeElement;
    if (box) {
      this.previewScale.set(Math.min(1, box.clientWidth / PREVIEW_DESKTOP_WIDTH));
    }
  }

  /** La sesión tal como está en el formulario, sin guardar: la que pinta la vista previa. */
  private buildPreview(): SessionPreview {
    const editing = this.editing();
    const form = this.form;
    const type = this.types().find((item) => item.idTipo === form.idTipo);
    return {
      detail: {
        idEvento: editing?.idEvento ?? 0,
        nombre: form.nombre || 'Sesión sin nombre',
        descripcion: form.descripcion,
        fechaInicio: form.fechaInicio || this.today,
        horaInicio: form.horaInicio || '19:00',
        duracion: form.duracion ?? 0,
        direccion: form.direccion,
        aforoMaximo: form.aforoMaximo ?? 0,
        minimoAsistencia: form.minimoAsistencia ?? 0,
        precio: form.precio ?? 0,
        idTipo: form.idTipo ?? 0,
        tipoEvento: type?.nombre ?? editing?.tipoEvento ?? '',
        estado: editing?.estado ?? 'ACTIVO',
        imagen: this.removePhoto() ? null : (editing?.imagen ?? null),
      },
      layer: this.dossierForm().preview(),
      imageUrl: this.photoFile() ? this.photoPreview() : null,
    };
  }

  readonly previewDesktopWidth = PREVIEW_DESKTOP_WIDTH;
  /** De qué sesiones se puede copiar el expediente: todas menos la que se modifica. */
  readonly dossierSources = computed(() =>
    this.sessions()
      .filter((session) => session.idEvento !== this.editing()?.idEvento)
      .map((session) => ({ idEvento: session.idEvento, nombre: `${this.number(session)} · ${session.nombre}` })),
  );

  readonly state = sessionState;
  readonly day = formatDay;
  readonly money = formatMoney;
  readonly typeLabel = humanizeCode;
  readonly plural = plural;
  readonly image = sessionImage;
  /** El número interno, a tres cifras (001, 002…): el id de la sesión, que no cambia. */
  number(session: EventoAdmin): string {
    return String(session.idEvento).padStart(3, '0');
  }

  /**
   * Despliega la ficha de la sesión, o la recoge si ya estaba abierta. Al desplegar, la vista baja lo
   * justo para enseñarla entera sin perder su fila (ver reveal-row); al recoger no se mueve (ver
   * KeepHeightDirective).
   */
  toggle(session: EventoAdmin): void {
    const id = this.expanded() === session.idEvento ? null : session.idEvento;
    this.expanded.set(id);
    if (id !== null) {
      afterNextRender(() => revealExpanded(document.getElementById(`session-detail-${id}`)), {
        injector: this.injector,
      });
    }
  }

  /** La referencia del archivo (AM-S/025): sale del id, así que no cambia aunque cambie el nombre. */
  readonly code = archiveCode;

  /** El horario (19:15 – 21:45): la hora de inicio más la duración. */
  readonly schedule = sessionSchedule;

  /** Hoy, en el formato del campo de fecha (aaaa-mm-dd), en la hora de quien usa el panel. */
  readonly today = isoToday();

  /** Una sesión cuya fecha ya pasó: no se reactiva sin cambiarle antes la fecha. */
  isPast(session: EventoAdmin): boolean {
    return session.fechaInicio < this.today;
  }

  /** La fecha más temprana del formulario: hoy, o la que ya tenía la sesión si es anterior. */
  minDate(): string {
    const current = this.editing()?.fechaInicio;
    return current && current < this.today ? current : this.today;
  }

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const values: FilterValues = { ...FILTER_DEFAULTS };
      for (const key of Object.keys(FILTER_DEFAULTS)) {
        values[key] = params.get(key) ?? FILTER_DEFAULTS[key];
      }
      this.filterValues.set(values);
    });
    this.load();
    this.admin.getTipos().subscribe({ next: (types) => this.types.set(types) });
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.admin.getEventos().subscribe({
      next: (sessions) => {
        this.sessions.set(sessions);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set(true);
      },
    });
  }

  /** Porcentaje de ocupación, para la barra. */
  occupancy(session: EventoAdmin): number {
    return session.aforoMaximo ? Math.min(100, (session.plazasReservadas / session.aforoMaximo) * 100) : 0;
  }

  openNew(): void {
    this.editing.set(null);
    this.reactivating.set(false);
    this.resetPhoto();
    this.page.set('datos');
    this.dossierForm().load(null);
    this.form = emptyForm(this.types()[0]?.idTipo ?? null);
    this.resetErrors();
    this.dialog().open();
  }

  openEdit(session: EventoAdmin, reactivating = false): void {
    this.editing.set(session);
    this.reactivating.set(reactivating);
    this.resetPhoto();
    this.page.set('datos');
    this.dossierForm().load(session.idEvento);
    this.form = {
      nombre: session.nombre,
      descripcion: session.descripcion ?? '',
      fechaInicio: session.fechaInicio,
      horaInicio: session.horaInicio ?? '',
      duracion: session.duracion,
      direccion: session.direccion ?? '',
      aforoMaximo: session.aforoMaximo,
      minimoAsistencia: session.minimoAsistencia,
      precio: session.precio,
      idTipo: session.idTipo,
    };
    this.resetErrors();
    this.dialog().open();
  }

  save(): void {
    if (this.saving()) {
      return;
    }
    const editing = this.editing();
    const reactivating = this.reactivating();
    this.resetErrors();
    if (reactivating && (!this.form.fechaInicio || this.form.fechaInicio < this.today)) {
      this.errors.set({ fechaInicio: 'Elige una fecha que no haya pasado' });
      this.formError.set('Revisa los campos marcados.');
      return;
    }
    this.saving.set(true);
    const request = editing
      ? this.admin.actualizarEvento(editing.idEvento, this.form)
      : this.admin.crearEvento(this.form);
    request.subscribe({
      next: (saved) => {
        this.upsert(saved);
        // Guardada: si la foto falla, se reintenta como edición, sin crearla dos veces.
        this.editing.set(saved);
        this.applyPhoto(saved).subscribe({
          next: (withPhoto) => {
            this.upsert(withPhoto);
            this.photoFile.set(null);
            this.removePhoto.set(false);
            this.saveDossier(withPhoto, () => this.finishSave(withPhoto, !!editing, reactivating));
          },
          error: (error) => {
            this.saving.set(false);
            this.page.set('datos');
            this.photoError.set(errorMessage(error, 'No se ha podido subir la foto.'));
            this.formError.set('Los datos se han guardado, pero la foto no.');
          },
        });
      },
      error: (error) => {
        this.saving.set(false);
        this.page.set('datos');
        const errors = fieldErrors(error);
        this.errors.set(errors);
        this.formError.set(
          Object.keys(errors).length
            ? 'Revisa los campos marcados.'
            : errorMessage(error, 'No se ha podido guardar la sesión.'),
        );
      },
    });
  }

  archive(session: EventoAdmin): void {
    this.changeState(session, this.admin.archivarEvento(session.idEvento), 'archivada');
  }

  unarchive(session: EventoAdmin): void {
    this.changeState(session, this.admin.desarchivarEvento(session.idEvento), 'fuera del archivo');
  }

  /** La foto elegida: se comprueba aquí lo mismo que en el servidor, para avisar antes de enviarla. */
  pickPhoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    this.photoError.set(null);
    if (!file) {
      return;
    }
    if (!PHOTO_TYPES.includes(file.type)) {
      this.photoError.set('La foto tiene que ser JPG, PNG o WebP.');
      return;
    }
    if (file.size > PHOTO_MAX_BYTES) {
      this.photoError.set('La foto pesa demasiado: como máximo 5 MB.');
      return;
    }
    this.setPreview(URL.createObjectURL(file));
    this.photoFile.set(file);
    this.removePhoto.set(false);
  }

  /** Vuelve a la foto genérica: si había una nueva sin guardar, se descarta; si había propia, se quitará. */
  dropPhoto(): void {
    this.setPreview(null);
    this.photoFile.set(null);
    this.photoError.set(null);
    this.removePhoto.set(!!this.editing()?.imagen);
  }

  /** La foto que verá el público tras guardar. Una sesión nueva sin foto recibe una genérica al crearse. */
  shownPhoto(): string | null {
    const preview = this.photoPreview();
    if (preview) {
      return preview;
    }
    const editing = this.editing();
    if (!editing) {
      return null;
    }
    return this.image(this.removePhoto() ? { ...editing, imagen: null } : editing);
  }

  hasOwnPhoto(): boolean {
    return !!this.photoFile() || (!!this.editing()?.imagen && !this.removePhoto());
  }

  async cancelSession(session: EventoAdmin): Promise<void> {
    const reservations =
      session.reservas === 0
        ? 'No tiene reservas.'
        : session.reservas === 1
          ? 'Su reserva se conserva y su cliente la verá cancelada.'
          : `Sus ${session.reservas} reservas se conservan y sus clientes la verán cancelada.`;
    const confirmed = await this.confirm.ask({
      title: '¿Cancelar la sesión?',
      message: `«${session.nombre}» dejará de admitir reservas. ${reservations} Podrás reactivarla después.`,
      confirm: 'Cancelar sesión',
      danger: true,
    });
    if (confirmed) {
      this.changeState(session, this.admin.cancelarEvento(session.idEvento), 'cancelada');
    }
  }

  /** Si su fecha ya pasó, antes hay que darle otra: se abre el formulario para eso. */
  reactivate(session: EventoAdmin): void {
    if (this.isPast(session)) {
      this.openEdit(session, true);
      return;
    }
    this.changeState(session, this.admin.reactivarEvento(session.idEvento), 'activa de nuevo');
  }

  /**
   * Borrar es para lo que nunca tuvo reservas (una errata, una duplicada). Con historia no se ofrece: se
   * cancela y, cuando ya no estorbe, se archiva (el servidor lo exige igual).
   */
  async remove(session: EventoAdmin): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: '¿Borrar la sesión?',
      message: `«${session.nombre}» desaparecerá del programa y del panel. No ha tenido reservas, así que no se pierde historia; no se puede deshacer.`,
      confirm: 'Borrar sesión',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    this.busy.set(session.idEvento);
    this.admin.borrarEvento(session.idEvento).subscribe({
      next: () => {
        this.busy.set(null);
        this.sessions.update((list) => list.filter((item) => item.idEvento !== session.idEvento));
        this.notice.set({ text: `«${session.nombre}» borrada.`, error: false });
        this.summary.refresh();
      },
      error: (error) => this.fail(error, 'No se ha podido borrar la sesión.'),
    });
  }

  error(field: string): string | null {
    return this.errors()[field] ?? null;
  }

  private changeState(
    session: EventoAdmin,
    request: ReturnType<AdminService['cancelarEvento']>,
    done: string,
  ): void {
    this.busy.set(session.idEvento);
    request.subscribe({
      next: (updated) => {
        this.busy.set(null);
        this.sessions.update((list) =>
          list.map((item) => (item.idEvento === updated.idEvento ? updated : item)),
        );
        this.notice.set({ text: `«${updated.nombre}» ${done}.`, error: false });
        this.summary.refresh();
      },
      error: (error) => this.fail(error, 'No se ha podido cambiar el estado de la sesión.'),
    });
  }

  /** Tras añadir sesiones demo desde el pie: la lista y las cifras de la cabecera. */
  afterDemo(): void {
    this.summary.refresh();
    this.load();
  }

  private fail(error: unknown, fallback: string): void {
    this.busy.set(null);
    this.notice.set({ text: errorMessage(error, fallback), error: true });
    // Lo más probable es que la sesión haya cambiado entretanto (una reserva nueva, por ejemplo).
    this.load();
  }

  /** El expediente, si ha cambiado, después de los datos y la foto; si falla, se queda abierto en él. */
  private saveDossier(saved: EventoAdmin, done: () => void): void {
    const form = this.dossierForm();
    if (!form.changed()) {
      done();
      return;
    }
    form.save(saved.idEvento).subscribe({
      next: () => {
        form.markSaved();
        done();
      },
      error: (error) => {
        this.saving.set(false);
        this.page.set('expediente');
        this.formError.set(`Los datos se han guardado, pero el expediente no. ${form.showErrors(error)}`);
      },
    });
  }

  private finishSave(saved: EventoAdmin, edited: boolean, reactivating: boolean): void {
    this.saving.set(false);
    this.dialog().close();
    if (reactivating) {
      this.changeState(saved, this.admin.reactivarEvento(saved.idEvento), 'con fecha nueva y activa de nuevo');
      return;
    }
    this.notice.set({
      text: edited ? `«${saved.nombre}» actualizada.` : `«${saved.nombre}» creada y activa.`,
      error: false,
    });
    this.summary.refresh();
  }

  private applyPhoto(saved: EventoAdmin): Observable<EventoAdmin> {
    const file = this.photoFile();
    if (file) {
      return this.admin.subirFotoEvento(saved.idEvento, file);
    }
    if (this.removePhoto() && saved.imagen) {
      return this.admin.quitarFotoEvento(saved.idEvento);
    }
    return of(saved);
  }

  private upsert(saved: EventoAdmin): void {
    this.sessions.update((list) =>
      list.some((item) => item.idEvento === saved.idEvento)
        ? list.map((item) => (item.idEvento === saved.idEvento ? saved : item))
        : [...list, saved].sort(byDate),
    );
  }

  private setPreview(url: string | null): void {
    const old = this.photoPreview();
    if (old) {
      URL.revokeObjectURL(old);
    }
    this.photoPreview.set(url);
  }

  private resetPhoto(): void {
    this.setPreview(null);
    this.photoFile.set(null);
    this.removePhoto.set(false);
    this.photoError.set(null);
  }

  private resetErrors(): void {
    this.errors.set({});
    this.formError.set(null);
  }
}

function emptyForm(idTipo: number | null = null): EventoPayload {
  return {
    nombre: '',
    descripcion: '',
    fechaInicio: '',
    horaInicio: '',
    duracion: 90,
    direccion: '',
    aforoMaximo: 50,
    minimoAsistencia: 10,
    precio: 20,
    idTipo,
  };
}

function byDate(a: EventoAdmin, b: EventoAdmin): number {
  return (a.fechaInicio + a.horaInicio).localeCompare(b.fechaInicio + b.horaInicio) || a.idEvento - b.idEvento;
}

function isoToday(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

