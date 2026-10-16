import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { EventService } from '../../core/services/event.service';
import { ReservationService } from '../../core/services/reservation.service';
import { CREDENTIALS } from '../../features/attendance/attendance';
import { longSessionDate, sessionPrice, ticketSessionDate } from '../../features/sessions/session-dossier';
import { bookingsOpen, sessionSchedule } from '../../features/sessions/session.presenter';
import { Asistente, EventoDetalle } from '../../models/api.models';
import { FitLineDirective } from '../../shared/fit-line/fit-line.directive';
import { errorMessage, fieldErrors } from '../../shared/panel/panel-format';

/** Lo más que se reserva de una vez, y lo más que una persona tiene en una sesión (lo comprueba el servidor). */
const MAX_SEATS = 10;

/**
 * Registro de asistencia: reservar plaza en una sesión identificando a cada participante (uno por
 * plaza, con la credencial que presentará y su procedencia), sus incompatibilidades, las adaptaciones
 * o el material externo que necesite y la conformidad con la edad y las condiciones de acceso. Se
 * llega desde el resguardo de la sesión, con las plazas ya elegidas (?plazas=).
 */
@Component({
  selector: 'app-attendance-page',
  standalone: true,
  imports: [FormsModule, RouterLink, FitLineDirective],
  templateUrl: './attendance-page.component.html',
  styleUrls: ['../../shared/secondary-page/secondary-page.css', './attendance-page.component.css'],
})
export class AttendancePageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly events = inject(EventService);
  private readonly reservations = inject(ReservationService);
  private readonly auth = inject(AuthService);

  readonly credentials = CREDENTIALS;
  readonly maxSeats = MAX_SEATS;
  readonly longDate = longSessionDate;
  readonly shortDate = ticketSessionDate;
  readonly schedule = sessionSchedule;
  readonly price = sessionPrice;

  readonly session = signal<EventoDetalle | null>(null);
  readonly loadError = signal(false);
  readonly sending = signal(false);
  readonly sent = signal(false);
  readonly errors = signal<Record<string, string>>({});
  readonly formError = signal<string | null>(null);

  readonly participants = signal<Asistente[]>([]);
  telefono = '';
  adaptaciones = '';
  materialExterno = false;
  materialDescripcion = '';
  aceptaEdad = false;
  aceptaCondiciones = false;
  aceptaComunicaciones = false;

  readonly open = computed(() => {
    const session = this.session();
    return !!session && session.estado === 'ACTIVO' && bookingsOpen(session);
  });

  readonly total = computed(() => (this.session()?.precio ?? 0) * this.participants().length);

  ngOnInit(): void {
    const seats = Number(this.route.snapshot.queryParamMap.get('plazas')) || 1;
    this.setSeats(seats);
    this.load();
  }

  load(): void {
    this.loadError.set(false);
    this.events.getDetalle(Number(this.route.snapshot.paramMap.get('id'))).subscribe({
      next: (session) => this.session.set(session),
      error: () => this.loadError.set(true),
    });
  }

  /** Un bloque por plaza; los que ya estaban rellenos se conservan. El primero, a nombre de quien reserva. */
  setSeats(value: number): void {
    const seats = Math.min(MAX_SEATS, Math.max(1, Math.round(Number(value)) || 1));
    this.participants.update((list) =>
      Array.from({ length: seats }, (_, i) => list[i] ?? emptyParticipant(i === 0 ? this.auth.currentUser()?.nombre : '')),
    );
  }

  /** Cambia un dato de un participante sin perder la referencia del resto (los campos no se redibujan). */
  update(index: number, key: keyof Asistente, value: string): void {
    this.participants.update((list) => list.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  }

  error(key: string): string | undefined {
    return this.errors()[key];
  }

  participantLabel(index: number): string {
    const name = this.participants()[index]?.nombre.trim();
    return name || `Participante ${index + 1}`;
  }

  submit(): void {
    const session = this.session();
    if (!session || this.sending()) {
      return;
    }
    this.sending.set(true);
    this.errors.set({});
    this.formError.set(null);
    this.reservations
      .registrar(session.idEvento, {
        cantidad: this.participants().length,
        asistentes: this.participants(),
        telefono: this.telefono,
        adaptaciones: this.adaptaciones,
        materialExterno: this.materialExterno,
        materialDescripcion: this.materialExterno ? this.materialDescripcion : '',
        aceptaEdad: this.aceptaEdad,
        aceptaCondiciones: this.aceptaCondiciones,
        aceptaComunicaciones: this.aceptaComunicaciones,
      })
      .subscribe({
        next: () => {
          this.sending.set(false);
          this.sent.set(true);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        error: (error) => {
          this.sending.set(false);
          const fields = fieldErrors(error);
          this.errors.set(fields);
          this.formError.set(
            Object.keys(fields).length
              ? 'Revise los apartados marcados.'
              : errorMessage(error, 'No se ha podido registrar la asistencia.'),
          );
        },
      });
  }
}

function emptyParticipant(nombre = ''): Asistente {
  return { nombre: nombre ?? '', credencial: '', procedencia: '', incompatibilidades: '' };
}
