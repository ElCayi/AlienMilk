import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ReservationService } from '../../../core/services/reservation.service';
import { credentialLabel } from '../../../features/attendance/attendance';
import { cancellable } from '../../../features/sessions/session.presenter';
import { Reserva } from '../../../models/api.models';
import { PanelConfirmService } from '../../../shared/panel/panel-confirm';
import {
  errorMessage,
  formatDay,
  reservationWhen,
  formatMoney,
  plural,
  reservationState,
} from '../../../shared/panel/panel-format';
import { AccountStore } from '../account-store';

/**
 * Mis reservas: las de sesiones activas, que se pueden cancelar, y el historial (sesiones canceladas
 * o ya celebradas), que se queda como estaba. La regla es la del servidor.
 */
@Component({
  selector: 'app-account-reservations-panel',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './account-reservations-panel.component.html',
  styleUrl: '../../../shared/panel/panel.css',
})
export class AccountReservationsPanelComponent {
  private readonly reservationService = inject(ReservationService);
  private readonly confirm = inject(PanelConfirmService);
  readonly store = inject(AccountStore);

  readonly notice = signal<{ text: string; error: boolean } | null>(null);
  readonly busy = signal<number | null>(null);

  readonly upcoming = computed(() =>
    (this.store.reservations() ?? [])
      .filter((reserva) => reserva.estadoEvento === 'ACTIVO')
      .sort((a, b) => a.fechaInicioEvento.localeCompare(b.fechaInicioEvento)),
  );

  readonly history = computed(() =>
    (this.store.reservations() ?? [])
      .filter((reserva) => reserva.estadoEvento !== 'ACTIVO')
      .sort((a, b) => b.fechaInicioEvento.localeCompare(a.fechaInicioEvento)),
  );

  readonly state = reservationState;
  readonly day = formatDay;
  readonly when = reservationWhen;
  readonly credential = credentialLabel;

  /** Hasta el día anterior a la sesión, como dicen sus preguntas frecuentes. */
  canCancel(reserva: Reserva): boolean {
    return cancellable(reserva.fechaInicioEvento);
  }
  readonly money = formatMoney;
  readonly plural = plural;

  async cancel(reserva: Reserva): Promise<void> {
    const seats = reserva.cantidad === 1 ? 'tu plaza' : `tus ${reserva.cantidad} plazas`;
    const confirmed = await this.confirm.ask({
      title: '¿Cancelar la reserva?',
      message: `Liberas ${seats} en «${reserva.nombreEvento}». Si cambias de idea, tendrás que reservar de nuevo.`,
      confirm: 'Cancelar reserva',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    this.busy.set(reserva.idReserva);
    this.reservationService.cancelar(reserva.idReserva).subscribe({
      next: () => {
        this.busy.set(null);
        this.store.reservations.update(
          (list) => list?.filter((item) => item.idReserva !== reserva.idReserva) ?? null,
        );
        this.notice.set({ text: `Reserva de «${reserva.nombreEvento}» cancelada.`, error: false });
      },
      error: (error) => {
        this.busy.set(null);
        this.notice.set({ text: errorMessage(error, 'No se ha podido cancelar la reserva.'), error: true });
        this.store.loadReservations();
      },
    });
  }
}
