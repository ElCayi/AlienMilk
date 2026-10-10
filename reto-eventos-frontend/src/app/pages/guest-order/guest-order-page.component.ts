import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ShopService } from '../../core/services/shop.service';
import { OrderReceiptComponent } from '../../features/shop/order-receipt/order-receipt.component';
import { formatOrderDate, ORDER_STATE_LABELS } from '../../features/shop/shop-format';
import { ApiError, Pedido } from '../../models/api.models';

/**
 * Pedido de invitado: /tienda/pedido/<referencia>#<clave>. La clave va tras la almohadilla, así que
 * el navegador no la manda al servidor con la página; esta la envía en una cabecera al pedir el
 * pedido. Sin cuenta no hay historial: esta página es el resguardo y el sitio para anularlo.
 */
@Component({
  selector: 'app-guest-order-page',
  standalone: true,
  imports: [OrderReceiptComponent, RouterLink],
  templateUrl: './guest-order-page.component.html',
  styleUrls: [
    '../../shared/secondary-page/secondary-page.css',
    '../../features/shop/shop-shared.css',
    './guest-order-page.component.css',
  ],
})
export class GuestOrderPageComponent {
  private readonly shop = inject(ShopService);
  private readonly route = inject(ActivatedRoute);

  readonly stateLabels = ORDER_STATE_LABELS;
  readonly orderDate = formatOrderDate;

  readonly reference = this.route.snapshot.paramMap.get('referencia') ?? '';
  private readonly key = this.route.snapshot.fragment ?? '';

  readonly status = signal<'loading' | 'ready' | 'missing' | 'error'>('loading');
  readonly order = signal<Pedido | null>(null);
  readonly cancelling = signal(false);
  readonly cancelError = signal<string | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    if (!this.key) {
      this.status.set('missing');
      return;
    }
    this.status.set('loading');
    this.shop.guestOrder(this.reference, this.key).subscribe({
      next: (order) => {
        this.order.set(order);
        this.status.set('ready');
      },
      error: (error: HttpErrorResponse) => this.status.set(error.status === 404 ? 'missing' : 'error'),
    });
  }

  cancel(order: Pedido): void {
    const confirmed = window.confirm(
      `¿Anular el pedido ${order.referencia}? Las unidades vuelven al centro de distribución.`,
    );
    if (!confirmed) {
      return;
    }
    this.cancelling.set(true);
    this.cancelError.set(null);
    this.shop.cancelGuestOrder(order.referencia, this.key).subscribe({
      next: (cancelled) => {
        this.cancelling.set(false);
        this.order.set(cancelled);
        // Las existencias han cambiado: la tienda las volverá a pedir.
        this.shop.catalog(true).subscribe({ error: () => undefined });
      },
      error: (error: HttpErrorResponse) => {
        this.cancelling.set(false);
        this.cancelError.set(
          (error.error as ApiError | null)?.message ?? 'No se ha podido anular el pedido. Inténtelo de nuevo.',
        );
      },
    });
  }
}
