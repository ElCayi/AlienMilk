import { Component, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ReservationService } from '../../../core/services/reservation.service';
import { credentialLabel } from '../../../features/attendance/attendance';
import { cancellable } from '../../../features/sessions/session.presenter';
import { Reserva, ReservaEditar } from '../../../models/api.models';
import { ReservationEditorComponent } from '../../../shared/panel/reservation-editor.component';
import { PanelConfirmService } from '../../../shared/panel/panel-confirm';
import {
  errorMessage,
  formatDay,
  reservationWhen,
  formatMoney,
  plural,
  reservationState,
  cancellationLine,
  formatTime,
  paymentBadge,
} from '../../../shared/panel/panel-format';
import { AccountStore } from '../account-store';

/**
 * Mis reservas: las de sesiones activas, que se pueden modificar o cancelar, y el historial (las
 * reservas canceladas y las de sesiones canceladas o ya celebradas), que se queda como estaba. La regla es la del servidor.
 */
@Component({
  selector: 'app-account-reservations-panel',
  standalone: true,
  imports: [RouterLink, ReservationEditorComponent],
  templateUrl: './account-reservations-panel.component.html',
  styleUrl: '../../../shared/panel/panel.css',
})
export class AccountReservationsPanelComponent {
  private readonly reservationService = inject(ReservationService);
  private readonly confirm = inject(PanelConfirmService);
  readonly store = inject(AccountStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly notice = signal<{ text: string; error: boolean } | null>(null);

  readonly editor = viewChild.required(ReservationEditorComponent);
  readonly saveData = (idReserva: number, datos: ReservaEditar) => this.reservationService.editar(idReserva, datos);
  readonly busy = signal<number | null>(null);

  readonly upcoming = computed(() =>
    (this.store.reservations() ?? [])
      .filter((reserva) => reserva.estadoEvento === 'ACTIVO' && !reserva.canceladaEn)
      .sort((a, b) => a.fechaInicioEvento.localeCompare(b.fechaInicioEvento)),
  );

  readonly history = computed(() =>
    (this.store.reservations() ?? [])
      .filter((reserva) => reserva.estadoEvento !== 'ACTIVO' || reserva.canceladaEn)
      .sort((a, b) => b.fechaInicioEvento.localeCompare(a.fechaInicioEvento)),
  );

  readonly state = reservationState;
  readonly cancellation = (reserva: Reserva) => cancellationLine(reserva, true);
  readonly payment = paymentBadge;
  readonly refunded = (reserva: Reserva) => Number(reserva.importeDevuelto);

  /**
   * Al volver de Stripe (?pago=hecho o ?pago=cancelado y ?reserva=), en cuanto llegan las reservas,
   * ya puestas al día por el servidor: qué ha pasado con esa. Se dice una vez y se limpia la dirección.
   */
  constructor() {
    const params = this.route.snapshot.queryParamMap;
    const pago = params.get('pago');
    const idReserva = Number(params.get('reserva'));
    if (!pago || !idReserva) {
      return;
    }
    let done = false;
    effect(() => {
      const reserva = this.store.reservations()?.find((item) => item.idReserva === idReserva);
      if (done || !reserva) {
        return;
      }
      done = true;
      untracked(() => {
        this.notice.set(this.returnNotice(pago, reserva));
        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { pago: null, reserva: null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
          scroll: 'manual',
        });
      });
    });
  }

  private returnNotice(pago: string, reserva: Reserva): { text: string; error: boolean } {
    const sesion = `«${reserva.nombreEvento}»`;
    if (reserva.estadoPago === 'PAGADA') {
      return { text: `Pago recibido: tu reserva de ${sesion} está confirmada.`, error: false };
    }
    if (reserva.canceladaEn) {
      return { text: `El pago de ${sesion} no se completó a tiempo y la reserva se ha anulado.`, error: true };
    }
    if (pago === 'hecho') {
      return { text: `Estamos confirmando tu pago de ${sesion}. En unos minutos aparecerá como pagada.`, error: false };
    }
    const hasta = reserva.pagoCaducaEn ? ` hasta las ${formatTime(reserva.pagoCaducaEn)}` : '';
    return { text: `No has completado el pago de ${sesion}. Guardamos tus plazas${hasta}: puedes pagar desde aquí.`, error: true };
  }
  readonly day = formatDay;
  readonly when = reservationWhen;
  readonly credential = credentialLabel;

  /** Hasta el día anterior a la sesión, como dicen sus preguntas frecuentes. */
  canCancel(reserva: Reserva): boolean {
    return cancellable(reserva.fechaInicioEvento);
  }
  readonly money = formatMoney;
  readonly plural = plural;

  afterEdit(updated: Reserva): void {
    this.store.reservations.update(
      (list) => list?.map((item) => (item.idReserva === updated.idReserva ? updated : item)) ?? null,
    );
    this.notice.set({ text: `Datos de la reserva de «${updated.nombreEvento}» guardados.`, error: false });
  }

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
        // No se borra: pasa al historial, marcada como cancelada por ti.
        this.store.loadReservations();
        this.notice.set({ text: `Reserva de «${reserva.nombreEvento}» cancelada. La tienes en el historial.`, error: false });
      },
      error: (error) => {
        this.busy.set(null);
        this.notice.set({ text: errorMessage(error, 'No se ha podido cancelar la reserva.'), error: true });
        this.store.loadReservations();
      },
    });
  }
}
