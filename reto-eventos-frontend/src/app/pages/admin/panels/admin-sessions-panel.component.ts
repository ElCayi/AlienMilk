import { afterNextRender, Component, computed, inject, Injector, OnInit, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
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
import { KeepHeightDirective } from '../../../shared/keep-height/keep-height.directive';
import { AdminSummaryService } from '../admin-summary.service';
import { DemoRestoreService } from '../demo-restore.service';
import { AdminDossierFormComponent } from './admin-dossier-form.component';

/** Fotos que admite el servidor (ver ImagenSesionService). */
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

/** «Todas» son las que no están archivadas; las archivadas tienen su propio filtro. */
type Filter = 'TODAS' | EstadoEvento | 'ARCHIVADAS';

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

/** Las dos páginas de Modificar sesión. */
type EditPage = 'datos' | 'expediente';

/**
 * Sesiones: el programa, con su ocupación. Una sesión nace activa; se cancela (y se puede
 * reactivar) con sus acciones, no desde el formulario. Con reservas, borrarla pide confirmarlo aparte
 * (y propone cancelarla, que deja las reservas en el panel de sus clientes).
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
  ],
  templateUrl: './admin-sessions-panel.component.html',
  styleUrl: '../../../shared/panel/panel.css',
})
export class AdminSessionsPanelComponent implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly confirm = inject(PanelConfirmService);
  private readonly summary = inject(AdminSummaryService);
  /** El atajo al pie para restaurar la demo, el mismo que en la pestaña Demo. */
  readonly demo = inject(DemoRestoreService);
  private readonly injector = inject(Injector);

  readonly sessions = signal<EventoAdmin[]>([]);
  readonly types = signal<TipoEvento[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly notice = signal<{ text: string; error: boolean } | null>(null);
  /** La sesión con una petición en curso, para no pulsar dos veces. */
  readonly busy = signal<number | null>(null);
  /** La sesión desplegada: su ficha y sus acciones, debajo de su fila. Una cada vez. */
  readonly expanded = signal<number | null>(null);

  readonly query = signal('');
  readonly filter = signal<Filter>('TODAS');

  readonly filters = computed(() => {
    const list = this.sessions().filter((session) => !session.archivada);
    const count = (estado: EstadoEvento) => list.filter((session) => session.estado === estado).length;
    return [
      { value: 'TODAS' as Filter, label: 'Todas', count: list.length },
      { value: 'ACTIVO' as Filter, label: 'Activas', count: count('ACTIVO') },
      { value: 'CANCELADO' as Filter, label: 'Canceladas', count: count('CANCELADO') },
      { value: 'TERMINADO' as Filter, label: 'Terminadas', count: count('TERMINADO') },
      {
        value: 'ARCHIVADAS' as Filter,
        label: 'Archivadas',
        count: this.sessions().length - list.length,
      },
    ];
  });

  /** El orden de la tabla: por fecha, de la más próxima a la más lejana, hasta que se pulse otra columna. */
  readonly sort = signal<{ key: SortKey; dir: 1 | -1 }>({ key: 'fecha', dir: 1 });

  /** Pulsar una columna ordena por ella de menor a mayor; volver a pulsarla, al revés. */
  sortBy(key: SortKey): void {
    this.sort.update((sort) => ({ key, dir: sort.key === key ? (sort.dir === 1 ? -1 : 1) : 1 }));
  }

  /** Para `aria-sort` en la cabecera: así un lector de pantalla sabe cómo está ordenada. */
  ariaSort(key: SortKey): 'ascending' | 'descending' | null {
    const sort = this.sort();
    return sort.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : null;
  }

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

  sortValue(): string {
    const sort = this.sort();
    return `${sort.key}:${sort.dir}`;
  }

  setSort(value: string): void {
    const [key, dir] = value.split(':');
    this.sort.set({ key: key as SortKey, dir: dir === '-1' ? -1 : 1 });
  }

  /** La flecha de cada columna: hacia arriba o abajo en la que ordena; doble y tenue en las demás. */
  sortIcon(key: SortKey): string {
    const sort = this.sort();
    if (sort.key !== key) {
      return 'M8 10l4-4 4 4M8 14l4 4 4-4';
    }
    return sort.dir === 1 ? 'M7 14l5-5 5 5' : 'M7 10l5 5 5-5';
  }

  readonly visible = computed(() => {
    const filter = this.filter();
    const query = this.query();
    const { key, dir } = this.sort();
    const compare = COMPARE[key];
    return this.sessions()
      .filter(
      (session) =>
        (filter === 'ARCHIVADAS'
          ? session.archivada
          : !session.archivada && (filter === 'TODAS' || session.estado === filter)) &&
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

  // Formulario de alta y edición, en el diálogo.
  readonly dialog = viewChild.required(PanelDialogComponent);
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
  /** El número interno, a dos cifras (01, 02…): el id de la sesión, que no cambia. */
  number(session: EventoAdmin): string {
    return String(session.idEvento).padStart(2, '0');
  }

  /**
   * Despliega la ficha de la sesión, o la recoge si ya estaba abierta. Al desplegar, la vista baja lo
   * justo para enseñarla entera; al recoger no se mueve (ver KeepHeightDirective).
   */
  toggle(session: EventoAdmin): void {
    const id = this.expanded() === session.idEvento ? null : session.idEvento;
    this.expanded.set(id);
    if (id !== null) {
      afterNextRender(
        () => {
          const detail = document.getElementById(`session-detail-${id}`);
          const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
          detail?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
        },
        { injector: this.injector },
      );
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
   * Sin reservas, se confirma y se borra. Con reservas, el aviso propone cancelarla (sus clientes la
   * siguen viendo, cancelada) o borrarla con ellas (desaparecen también de su panel).
   */
  async remove(session: EventoAdmin): Promise<void> {
    const withReservations = session.reservas > 0;
    const cancellable = session.estado === 'ACTIVO';
    const choice = await this.confirm.choose(
      withReservations
        ? {
            title: '¿Borrar una sesión con reservas?',
            message:
              `«${session.nombre}» tiene ${plural(session.reservas, 'reserva', 'reservas')}. Si la borras, ` +
              (session.reservas === 1 ? 'se borra con ella y desaparece' : 'se borran con ella y desaparecen') +
              ' también del panel de sus clientes. ' +
              (cancellable ? 'Si la cancelas, la siguen viendo, cancelada. ' : '') +
              'Borrarla no se puede deshacer.',
            confirm: 'Borrar',
            alternative: cancellable ? 'Cancelar sesión' : undefined,
            danger: true,
          }
        : {
            title: '¿Borrar la sesión?',
            message: `«${session.nombre}» desaparecerá del programa y del panel. No se puede deshacer.`,
            confirm: 'Borrar sesión',
            danger: true,
          },
    );
    if (choice === 'alternative') {
      this.changeState(session, this.admin.cancelarEvento(session.idEvento), 'cancelada');
      return;
    }
    if (choice !== 'confirm') {
      return;
    }
    this.busy.set(session.idEvento);
    this.admin.borrarEvento(session.idEvento, withReservations).subscribe({
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

  /** Lo que ha pasado al añadir sesiones de ejemplo: sale junto a los botones del pie. */
  readonly demoNotice = signal<{ text: string; error: boolean } | null>(null);
  readonly addingDemo = signal(false);

  addDemoSessions(): void {
    this.addingDemo.set(true);
    this.demoNotice.set(null);
    this.admin.anadirSesionesDemo().subscribe({
      next: ({ creadas }) => {
        this.addingDemo.set(false);
        this.demoNotice.set({
          text: `${plural(creadas.length, 'sesión añadida', 'sesiones añadidas')} al final del programa.`,
          error: false,
        });
        this.summary.refresh();
        this.load();
      },
      error: (error) => {
        this.addingDemo.set(false);
        this.demoNotice.set({ text: errorMessage(error, 'No se han podido añadir las sesiones demo.'), error: true });
      },
    });
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

