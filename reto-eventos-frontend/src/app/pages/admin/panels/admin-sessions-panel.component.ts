import { Component, computed, inject, OnInit, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable, of } from 'rxjs';

import { AdminService } from '../../../core/services/admin.service';
import { sessionImage } from '../../../features/sessions/session.presenter';
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
import { AdminSummaryService } from '../admin-summary.service';
import { AdminDossierEditorComponent } from './admin-dossier-editor.component';

/** Fotos que admite el servidor (ver ImagenSesionService). */
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

type Filter = 'TODAS' | EstadoEvento;

/**
 * Sesiones: el programa, con su ocupación. Una sesión nace activa; se cancela (y se puede
 * reactivar) con sus acciones, no desde el formulario. Con reservas no se borra: se cancela, y sus
 * clientes la ven cancelada en su panel.
 */
@Component({
  selector: 'app-admin-sessions-panel',
  standalone: true,
  imports: [FormsModule, RouterLink, PanelDialogComponent, AdminDossierEditorComponent],
  templateUrl: './admin-sessions-panel.component.html',
  styleUrl: '../../../shared/panel/panel.css',
})
export class AdminSessionsPanelComponent implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly confirm = inject(PanelConfirmService);
  private readonly summary = inject(AdminSummaryService);

  readonly sessions = signal<EventoAdmin[]>([]);
  readonly types = signal<TipoEvento[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly notice = signal<{ text: string; error: boolean } | null>(null);
  /** La sesión con una petición en curso, para no pulsar dos veces. */
  readonly busy = signal<number | null>(null);

  readonly query = signal('');
  readonly filter = signal<Filter>('TODAS');

  readonly filters = computed(() => {
    const list = this.sessions();
    const count = (estado: EstadoEvento) => list.filter((session) => session.estado === estado).length;
    return [
      { value: 'TODAS' as Filter, label: 'Todas', count: list.length },
      { value: 'ACTIVO' as Filter, label: 'Activas', count: count('ACTIVO') },
      { value: 'CANCELADO' as Filter, label: 'Canceladas', count: count('CANCELADO') },
      { value: 'TERMINADO' as Filter, label: 'Terminadas', count: count('TERMINADO') },
    ];
  });

  readonly visible = computed(() => {
    const filter = this.filter();
    const query = this.query();
    return this.sessions().filter(
      (session) =>
        (filter === 'TODAS' || session.estado === filter) &&
        matches(query, session.nombre, humanizeCode(session.tipoEvento), session.direccion),
    );
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

  readonly dossierEditor = viewChild.required(AdminDossierEditorComponent);

  readonly state = sessionState;
  readonly day = formatDay;
  readonly money = formatMoney;
  readonly typeLabel = humanizeCode;
  readonly plural = plural;
  readonly image = sessionImage;

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
    this.form = emptyForm(this.types()[0]?.idTipo ?? null);
    this.resetErrors();
    this.dialog().open();
  }

  openEdit(session: EventoAdmin, reactivating = false): void {
    this.editing.set(session);
    this.reactivating.set(reactivating);
    this.resetPhoto();
    this.form = {
      nombre: session.nombre,
      descripcion: session.descripcion ?? '',
      fechaInicio: session.fechaInicio,
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
            this.saving.set(false);
            this.dialog().close();
            if (reactivating) {
              this.changeState(withPhoto, this.admin.reactivarEvento(withPhoto.idEvento), 'con fecha nueva y activa de nuevo');
              return;
            }
            this.notice.set({
              text: editing ? `«${withPhoto.nombre}» actualizada.` : `«${withPhoto.nombre}» creada y activa.`,
              error: false,
            });
            this.summary.refresh();
          },
          error: (error) => {
            this.saving.set(false);
            this.photoError.set(errorMessage(error, 'No se ha podido subir la foto.'));
            this.formError.set('Los datos se han guardado, pero la foto no.');
          },
        });
      },
      error: (error) => {
        this.saving.set(false);
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

  /** Vuelve a la foto de la web: si había una nueva sin guardar, se descarta; si había propia, se quitará. */
  dropPhoto(): void {
    this.setPreview(null);
    this.photoFile.set(null);
    this.photoError.set(null);
    this.removePhoto.set(!!this.editing()?.imagen);
  }

  /** La foto que verá el público tras guardar. Una sesión nueva sin foto recibe una de la web al crearse. */
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

  openDossier(session: EventoAdmin): void {
    this.dossierEditor().open({
      scope: { tipo: 'sesion', id: session.idEvento },
      name: session.nombre,
      typeName: session.tipoEvento,
    });
  }

  openCommonDossier(): void {
    this.dossierEditor().open({ scope: { tipo: 'general' }, name: 'todas las sesiones' });
  }

  dossierSaved(text: string): void {
    this.notice.set({ text, error: false });
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

  async remove(session: EventoAdmin): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: '¿Borrar la sesión?',
      message: `«${session.nombre}» desaparecerá del programa y del panel. No se puede deshacer.`,
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

  private fail(error: unknown, fallback: string): void {
    this.busy.set(null);
    this.notice.set({ text: errorMessage(error, fallback), error: true });
    // Lo más probable es que la sesión haya cambiado entretanto (una reserva nueva, por ejemplo).
    this.load();
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
    duracion: 90,
    direccion: '',
    aforoMaximo: 50,
    minimoAsistencia: 10,
    precio: 20,
    idTipo,
  };
}

function byDate(a: EventoAdmin, b: EventoAdmin): number {
  return a.fechaInicio.localeCompare(b.fechaInicio) || a.idEvento - b.idEvento;
}

function isoToday(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
