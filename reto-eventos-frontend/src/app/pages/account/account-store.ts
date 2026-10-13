import { computed, inject, Injectable, signal } from '@angular/core';

import { ReservationService } from '../../core/services/reservation.service';
import { ShopService } from '../../core/services/shop.service';
import { Pedido, Reserva } from '../../models/api.models';

/**
 * Lo que enseña Mi panel: las reservas y los pedidos de la cuenta. Vive con la página (la provee el
 * armazón), así que otra cuenta que entre después no ve nada de la anterior. Las pestañas cuentan lo
 * que sigue en marcha y cada sección pinta su lista.
 */
@Injectable()
export class AccountStore {
  private readonly reservationService = inject(ReservationService);
  private readonly shop = inject(ShopService);

  readonly reservations = signal<Reserva[] | null>(null);
  readonly reservationsError = signal(false);
  readonly orders = signal<Pedido[] | null>(null);
  readonly ordersError = signal(false);

  /** Reservas de sesiones activas: las que aún se pueden cancelar. */
  readonly activeReservations = computed(
    () => this.reservations()?.filter((reserva) => reserva.estadoEvento === 'ACTIVO').length ?? 0,
  );

  /** Pedidos que no han terminado: por pagar, preparándose o de camino. */
  readonly ordersInProgress = computed(
    () =>
      this.orders()?.filter(({ estado }) => estado !== 'ENTREGADO' && estado !== 'ANULADO').length ?? 0,
  );

  loadReservations(): void {
    this.reservationsError.set(false);
    this.reservationService.getMine().subscribe({
      next: (reservations) => this.reservations.set(reservations),
      error: () => this.reservationsError.set(true),
    });
  }

  loadOrders(): void {
    this.ordersError.set(false);
    this.shop.myOrders().subscribe({
      next: (orders) => this.orders.set(orders),
      error: () => this.ordersError.set(true),
    });
  }

  replaceOrder(updated: Pedido): void {
    this.orders.update(
      (orders) => orders?.map((order) => (order.idPedido === updated.idPedido ? updated : order)) ?? null,
    );
  }
}
