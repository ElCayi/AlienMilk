import { Component, computed, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';

import { CREDENTIALS } from '../../features/attendance/attendance';
import { Asistente, EventoAdmin, Reserva, ReservaEditar } from '../../models/api.models';
import { PanelDialogComponent } from './panel-dialog.component';
import { errorMessage, fieldErrors, formatDay, formatMoney, plural } from './panel-format';

/** El formulario completo: lo que manda el admin. El cliente solo usa el teléfono y los participantes. */
interface EditorForm {
  telefono: string;
  observaciones: string;
  asistentes: Asistente[];
  idEvento: number;
  cantidad: number;
  adaptaciones: string;
  materialExterno: boolean;
  materialDescripcion: string;
}

const emptyPerson = (): Asistente => ({ nombre: '', credencial: '', procedencia: '', incompatibilidades: '' });

/**
 * Editar una reserva. Desde el admin, todo lo que tiene salvo la conformidad, que es lo que firmó el
 * cliente: la sesión, las plazas (el importe se recalcula), el contacto, las observaciones, las
 * adaptaciones, el material y los participantes. Desde Mi panel, el teléfono y los participantes. El
 * aforo y los plazos los comprueba el servidor.
 */
@Component({
  selector: 'app-reservation-editor',
  standalone: true,
  imports: [FormsModule, PanelDialogComponent],
  templateUrl: './reservation-editor.component.html',
  styleUrls: ['./panel.css', './reservation-editor.component.css'],
})
export class ReservationEditorComponent {
  /** Cómo se guarda: el endpoint del admin o el del cliente. */
  readonly save = input.required<(idReserva: number, datos: ReservaEditar) => Observable<Reserva>>();
  /** El admin lo edita todo; el cliente, sus datos de contacto y de participantes. */
  readonly admin = input(false);
  /** Las sesiones a las que se puede mover la reserva (solo admin). */
  readonly sessions = input<EventoAdmin[]>([]);
  readonly saved = output<Reserva>();

  private readonly dialog = viewChild.required(PanelDialogComponent);

  readonly target = signal<Reserva | null>(null);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly errors = signal<Record<string, string>>({});
  readonly credentials = CREDENTIALS;
  readonly plural = plural;
  readonly money = formatMoney;
  readonly day = formatDay;
  form: EditorForm = this.blank();

  /** Las sesiones activas, y la suya aunque ya no lo esté, para que el selector no quede vacío. */
  readonly sessionOptions = computed(() => {
    const own = this.target()?.idEvento;
    return this.sessions().filter((session) => session.estado === 'ACTIVO' || session.idEvento === own);
  });

  open(reserva: Reserva): void {
    this.target.set(reserva);
    this.form = {
      telefono: reserva.telefono ?? '',
      observaciones: reserva.observaciones ?? '',
      asistentes: reserva.asistentes.map((persona) => ({ ...persona })),
      idEvento: reserva.idEvento,
      cantidad: reserva.cantidad,
      adaptaciones: reserva.adaptaciones ?? '',
      materialExterno: reserva.materialExterno,
      materialDescripcion: reserva.materialDescripcion ?? '',
    };
    this.errors.set({});
    this.error.set(null);
    this.dialog().open();
  }

  close(): void {
    this.dialog().close();
  }

  /** Una reserva sin registrar: una ficha vacía por plaza. */
  addParticipants(): void {
    this.form.asistentes = Array.from({ length: this.form.cantidad }, emptyPerson);
  }

  /** Con participantes registrados, la lista sigue a las plazas: se añaden fichas vacías o se quitan las últimas. */
  setSeats(value: number): void {
    const cantidad = Math.trunc(Number(value));
    if (!Number.isFinite(cantidad) || cantidad < 1) {
      return;
    }
    this.form.cantidad = cantidad;
    const people = this.form.asistentes;
    if (people.length && cantidad <= 10) {
      this.form.asistentes =
        cantidad < people.length
          ? people.slice(0, cantidad)
          : [...people, ...Array.from({ length: cantidad - people.length }, emptyPerson)];
    }
  }

  /** Plazas libres de una sesión para esta reserva: las suyas cuentan como libres si ya está en ella. */
  free(session: EventoAdmin): number {
    const target = this.target();
    const own = target && target.idEvento === session.idEvento ? target.cantidad : 0;
    return Math.max(0, session.aforoMaximo - session.plazasReservadas + own);
  }

  selectedSession(): EventoAdmin | undefined {
    return this.sessions().find((session) => session.idEvento === this.form.idEvento);
  }

  maxSeats(): number {
    const session = this.selectedSession();
    return Math.min(10, session ? this.free(session) : 10);
  }

  submit(): void {
    const target = this.target();
    if (!target || this.saving()) {
      return;
    }
    const { telefono, asistentes } = this.form;
    const datos: ReservaEditar = this.admin() ? { ...this.form } : { telefono, asistentes };
    this.saving.set(true);
    this.error.set(null);
    this.errors.set({});
    this.save()(target.idReserva, datos).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.dialog().close();
        this.saved.emit(updated);
      },
      error: (error) => {
        this.saving.set(false);
        this.errors.set(fieldErrors(error));
        this.error.set(errorMessage(error, 'No se han podido guardar los cambios.'));
      },
    });
  }

  fieldError(campo: string): string | undefined {
    return this.errors()[campo];
  }

  private blank(): EditorForm {
    return {
      telefono: '',
      observaciones: '',
      asistentes: [],
      idEvento: 0,
      cantidad: 1,
      adaptaciones: '',
      materialExterno: false,
      materialDescripcion: '',
    };
  }
}
