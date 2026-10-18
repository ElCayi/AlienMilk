import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ShopService } from '../../../core/services/shop.service';
import { rememberPayment } from '../../../features/shop/pending-payment';
import { DELIVERY_LABELS, formatTime, ORDER_STATE_LABELS } from '../../../features/shop/shop-format';
import { EstadoPedido, Pedido } from '../../../models/api.models';
import { PanelConfirmService } from '../../../shared/panel/panel-confirm';
import {
  errorMessage,
  formatDayTime,
  formatMoney,
  plural,
  Tone,
} from '../../../shared/panel/panel-format';
import { AccountStore } from '../account-store';
import { SectionHelpComponent } from '../../../shared/panel/section-help.component';

/** Pendiente de pago pide algo de ti; preparándose o de camino, en marcha; lo demás, cerrado. */
const STATE_TONES: Record<EstadoPedido, Tone> = {
  PENDIENTE_PAGO: 'alert',
  CONFIRMADO: 'ok',
  ENVIADO: 'ok',
  ENTREGADO: 'off',
  ANULADO: 'off',
};

/**
 * Mis pedidos de la tienda, los mismos que su historial: se pagan si quedaron pendientes y se anulan
 * mientras no hayan salido del centro de distribución (lo decide el servidor). Pagar lleva a la
 * página de Stripe, que vuelve a la tienda.
 */
@Component({
  selector: 'app-account-orders-panel',
  standalone: true,
  imports: [SectionHelpComponent, RouterLink],
  templateUrl: './account-orders-panel.component.html',
  styleUrl: '../../../shared/panel/panel.css',
})
export class AccountOrdersPanelComponent {
  private readonly shop = inject(ShopService);
  private readonly confirm = inject(PanelConfirmService);
  readonly store = inject(AccountStore);

  readonly notice = signal<{ text: string; error: boolean } | null>(null);
  readonly busy = signal<number | null>(null);

  readonly orders = computed(() => this.store.orders() ?? []);

  readonly stateLabels = ORDER_STATE_LABELS;
  readonly stateTones = STATE_TONES;
  readonly deliveryLabels = DELIVERY_LABELS;
  readonly money = formatMoney;
  readonly when = formatDayTime;
  readonly time = formatTime;
  readonly plural = plural;

  units(order: Pedido): number {
    return order.lineas.reduce((total, line) => total + line.cantidad, 0);
  }

  /** Se anula mientras no haya salido: el servidor lo vuelve a comprobar. */
  cancellable(order: Pedido): boolean {
    return order.estado === 'CONFIRMADO' || order.estado === 'PENDIENTE_PAGO';
  }

  /** Lo que ha pasado después de hacerlo, en una línea. */
  progress(order: Pedido): string | null {
    if (order.estado === 'PENDIENTE_PAGO' && order.pagoCaducaEn) {
      return `Págalo antes de las ${this.time(order.pagoCaducaEn)}`;
    }
    if (order.anuladoEn) {
      return `Anulado el ${this.when(order.anuladoEn)}`;
    }
    if (order.entregadoEn) {
      return `${order.entrega === 'RECOGIDA' ? 'Recogido' : 'Entregado'} el ${this.when(order.entregadoEn)}`;
    }
    if (order.enviadoEn) {
      return `Salió el ${this.when(order.enviadoEn)}`;
    }
    return order.estado === 'CONFIRMADO' ? 'Preparándose en el centro de distribución' : null;
  }

  /** A la página de pago de Stripe; al volver, la tienda reconoce el pedido. */
  pay(order: Pedido): void {
    if (!order.pagoUrl) {
      return;
    }
    rememberPayment(order);
    window.location.assign(order.pagoUrl);
  }

  async cancel(order: Pedido): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: `¿Anular el pedido ${order.referencia}?`,
      message:
        order.estado === 'PENDIENTE_PAGO'
          ? 'Sus unidades vuelven al centro de distribución y ya no podrás pagarlo.'
          : 'Sus unidades vuelven al centro de distribución. Si lo pagaste con tarjeta, se te devuelve el importe.',
      confirm: 'Anular pedido',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    this.busy.set(order.idPedido);
    this.shop.cancelOrder(order.idPedido).subscribe({
      next: (cancelled) => {
        this.busy.set(null);
        this.store.replaceOrder(cancelled);
        this.notice.set({ text: `Pedido ${cancelled.referencia} anulado.`, error: false });
        // Las existencias del catálogo han cambiado.
        this.shop.catalog(true).subscribe({ error: () => undefined });
      },
      error: (error) => {
        this.busy.set(null);
        this.notice.set({ text: errorMessage(error, 'No se ha podido anular el pedido.'), error: true });
        this.store.loadOrders();
      },
    });
  }
}
