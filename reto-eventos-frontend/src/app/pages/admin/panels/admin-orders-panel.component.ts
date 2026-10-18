import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ShopService } from '../../../core/services/shop.service';
import { DELIVERY_LABELS, ORDER_STATE_LABELS } from '../../../features/shop/shop-format';
import { EstadoPedido, PedidoAdmin } from '../../../models/api.models';
import { PanelConfirmService } from '../../../shared/panel/panel-confirm';
import {
  errorMessage,
  formatDayTime,
  formatMoney,
  matches,
  plural,
  Tone,
} from '../../../shared/panel/panel-format';
import { KeepHeightDirective } from '../../../shared/keep-height/keep-height.directive';
import { AdminSummaryService } from '../admin-summary.service';
import { SectionHelpComponent } from '../../../shared/panel/section-help.component';

type Filter = 'PREPARAR' | 'CAMINO' | 'PAGO' | 'CERRADOS' | 'TODOS';

const FILTER_STATES: Record<Exclude<Filter, 'TODOS'>, EstadoPedido[]> = {
  PREPARAR: ['CONFIRMADO'],
  CAMINO: ['ENVIADO'],
  PAGO: ['PENDIENTE_PAGO'],
  CERRADOS: ['ENTREGADO', 'ANULADO'],
};

/** Por preparar pide atención; en camino o esperando el pago, en marcha; lo demás, cerrado. */
const STATE_TONES: Record<EstadoPedido, Tone> = {
  CONFIRMADO: 'alert',
  PENDIENTE_PAGO: 'ok',
  ENVIADO: 'ok',
  ENTREGADO: 'off',
  ANULADO: 'off',
};

/**
 * Centro de distribución: los pedidos de la tienda, de los que hay que preparar a los ya cerrados.
 * El servidor dice qué paso le toca a cada uno y si aún se puede anular; el panel solo enseña los
 * botones que corresponden.
 */
@Component({
  selector: 'app-admin-orders-panel',
  standalone: true,
  imports: [SectionHelpComponent, FormsModule, KeepHeightDirective],
  templateUrl: './admin-orders-panel.component.html',
  styleUrl: '../../../shared/panel/panel.css',
})
export class AdminOrdersPanelComponent implements OnInit {
  private readonly shop = inject(ShopService);
  private readonly confirm = inject(PanelConfirmService);
  private readonly summary = inject(AdminSummaryService);

  readonly all = signal<PedidoAdmin[]>([]);
  readonly filter = signal<Filter>('PREPARAR');
  readonly query = signal('');
  readonly loading = signal(true);
  readonly loadError = signal(false);
  /** El pedido con una petición en curso, para no pulsar dos veces. */
  readonly busy = signal<number | null>(null);
  readonly feedback = signal<{ text: string; error: boolean } | null>(null);

  readonly filters = computed(() => {
    const list = this.all();
    const count = (filter: Exclude<Filter, 'TODOS'>) =>
      list.filter(({ pedido }) => FILTER_STATES[filter].includes(pedido.estado)).length;
    return [
      { value: 'PREPARAR' as Filter, label: 'Por preparar', count: count('PREPARAR') },
      { value: 'CAMINO' as Filter, label: 'En camino', count: count('CAMINO') },
      { value: 'PAGO' as Filter, label: 'Sin pagar', count: count('PAGO') },
      { value: 'CERRADOS' as Filter, label: 'Cerrados', count: count('CERRADOS') },
      { value: 'TODOS' as Filter, label: 'Todos', count: list.length },
    ];
  });

  readonly visible = computed(() => {
    const filter = this.filter();
    const query = this.query();
    return this.all().filter(
      ({ pedido, cuenta, correo }) =>
        (filter === 'TODOS' || FILTER_STATES[filter].includes(pedido.estado)) &&
        matches(query, pedido.referencia, pedido.nombre, cuenta, correo, pedido.direccion),
    );
  });

  readonly stateLabels = ORDER_STATE_LABELS;
  readonly stateTones = STATE_TONES;
  readonly deliveryLabels = DELIVERY_LABELS;
  readonly money = formatMoney;
  readonly when = formatDayTime;
  readonly plural = plural;

  ngOnInit(): void {
    this.load();
  }

  /** `keepFeedback`: tras un error se recarga sin borrar el aviso que lo explica. */
  load(keepFeedback = false): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.shop.allOrders().subscribe({
      next: (orders) => {
        this.all.set(orders);
        this.loading.set(false);
        if (!keepFeedback) {
          this.feedback.set(null);
        }
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set(true);
      },
    });
    this.summary.refresh();
  }

  units(order: PedidoAdmin): number {
    return order.pedido.lineas.reduce((total, line) => total + line.cantidad, 0);
  }

  /** «Marcar enviado», o «entregado»; en una recogida, «recogido». */
  nextLabel(order: PedidoAdmin): string {
    if (order.siguiente === 'ENVIADO') {
      return 'Marcar enviado';
    }
    return order.pedido.entrega === 'RECOGIDA' ? 'Marcar recogido' : 'Marcar entregado';
  }

  advance(order: PedidoAdmin): void {
    const next = order.siguiente;
    if (!next) {
      return;
    }
    this.busy.set(order.pedido.idPedido);
    this.shop.advanceOrder(order.pedido.idPedido, next).subscribe({
      next: (updated) => {
        this.replace(updated);
        this.feedback.set({
          text: `${updated.pedido.referencia}: ${this.doneLabel(updated)}.`,
          error: false,
        });
        this.summary.refresh();
      },
      error: (err) => this.fail(err, 'No se ha podido cambiar el estado.'),
    });
  }

  async cancel(order: PedidoAdmin): Promise<void> {
    const { referencia, total } = order.pedido;
    const refund =
      order.pagadoEn && !order.reembolsado
        ? ` Se devolverán ${this.money(total)} a la tarjeta con la que se pagó.`
        : '';
    const confirmed = await this.confirm.ask({
      title: `¿Anular el pedido ${referencia}?`,
      message: `Sus unidades vuelven al centro de distribución.${refund}`,
      confirm: 'Anular pedido',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    this.busy.set(order.pedido.idPedido);
    this.shop.cancelOrderAsAdmin(order.pedido.idPedido).subscribe({
      next: (updated) => {
        this.replace(updated);
        this.feedback.set({
          text: `${referencia} anulado${updated.reembolsado ? ' y reembolsado' : ''}.`,
          error: false,
        });
        this.summary.refresh();
      },
      error: (err) => this.fail(err, 'No se ha podido anular el pedido.'),
    });
  }

  /** El cobro en pocas palabras: con tarjeta, devuelto, pendiente o sin cobro (demostración). */
  payment(order: PedidoAdmin): string {
    if (order.reembolsado) {
      return 'Reembolsado';
    }
    if (order.pagadoEn) {
      return `Pagado con tarjeta · ${this.when(order.pagadoEn)}`;
    }
    if (order.pedido.estado === 'PENDIENTE_PAGO') {
      return 'Esperando el pago';
    }
    return 'Sin cobro (tienda de demostración)';
  }

  /** La última fecha que cuenta: anulado, entregado o enviado. */
  lastStep(order: PedidoAdmin): string | null {
    const { anuladoEn, entregadoEn, enviadoEn, entrega } = order.pedido;
    if (anuladoEn) {
      return `Anulado el ${this.when(anuladoEn)}`;
    }
    if (entregadoEn) {
      return `${entrega === 'RECOGIDA' ? 'Recogido' : 'Entregado'} el ${this.when(entregadoEn)}`;
    }
    if (enviadoEn) {
      return `Salió el ${this.when(enviadoEn)}`;
    }
    return null;
  }

  replyHref(order: PedidoAdmin): string {
    return `mailto:${order.correo}?subject=${encodeURIComponent(`Pedido ${order.pedido.referencia}`)}`;
  }

  /** Lo que se acaba de hacer, para el aviso: «enviado», «entregado» o «recogido». */
  private doneLabel(order: PedidoAdmin): string {
    if (order.pedido.estado === 'ENVIADO') {
      return 'enviado';
    }
    return order.pedido.entrega === 'RECOGIDA' ? 'recogido' : 'entregado';
  }

  private replace(updated: PedidoAdmin): void {
    this.all.update((list) =>
      list.map((item) => (item.pedido.idPedido === updated.pedido.idPedido ? updated : item)),
    );
    this.busy.set(null);
  }

  private fail(err: unknown, fallback: string): void {
    this.busy.set(null);
    this.feedback.set({ text: errorMessage(err, fallback), error: true });
    // Lo más probable es que el pedido haya cambiado entretanto (un pago, el cliente que lo anula).
    this.load(true);
  }
}
