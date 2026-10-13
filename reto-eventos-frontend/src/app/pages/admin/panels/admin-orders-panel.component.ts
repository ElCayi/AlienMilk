import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';

import { ShopService } from '../../../core/services/shop.service';
import {
  DELIVERY_LABELS,
  formatPrice,
  ORDER_STATE_LABELS,
} from '../../../features/shop/shop-format';
import { EstadoPedido, PedidoAdmin } from '../../../models/api.models';

type Filter = 'PREPARAR' | 'CAMINO' | 'PAGO' | 'CERRADOS' | 'TODOS';

const FILTER_STATES: Record<Exclude<Filter, 'TODOS'>, EstadoPedido[]> = {
  PREPARAR: ['CONFIRMADO'],
  CAMINO: ['ENVIADO'],
  PAGO: ['PENDIENTE_PAGO'],
  CERRADOS: ['ENTREGADO', 'ANULADO'],
};

/**
 * Centro de distribución: los pedidos de la tienda, de los que hay que preparar a los ya cerrados.
 * El servidor dice qué paso le toca a cada uno y si aún se puede anular; el panel solo enseña los
 * botones que corresponden.
 */
@Component({
  selector: 'app-admin-orders-panel',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './admin-orders-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .orders-panel {
      grid-column: 1 / -1;
    }

    /* Sin esto, en móvil la lista se ensancha hasta el mínimo de sus columnas y se sale del panel. */
    .orders-panel > * {
      min-width: 0;
    }

    .order-filters {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .order-filters button[aria-pressed='true'] {
      background: #ff7f7f;
      color: #211e24;
    }

    .order-card,
    .order-card :is(p, dl, ul) {
      font-family: 'Nunito', sans-serif;
    }

    .order-card a {
      color: #f1ecef;
      text-underline-offset: 0.2em;
    }

    .order-card {
      display: grid;
      gap: 0.75rem;
      padding: 1rem 1.1rem;
      border-radius: 18px;
      background: #211e24;
    }

    .order-card.is-pending {
      box-shadow: inset 3px 0 0 #ff7f7f;
    }

    .order-card-head {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 0.5rem 1rem;
    }

    .order-card-head p {
      margin: 0.2rem 0 0;
      color: #b9afb6;
    }

    .order-state {
      margin-left: 0.5rem;
      color: #b9afb6;
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .order-data {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(14rem, 100%), 1fr));
      gap: 0.5rem 1.25rem;
      margin: 0;
    }

    .order-data dt {
      color: #b9afb6;
      font-size: 0.8rem;
    }

    .order-data dd {
      margin: 0.1rem 0 0;
      overflow-wrap: anywhere;
    }

    .order-lines {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .panel-feedback {
      margin: 0;
      color: #b9afb6;
    }

    .panel-feedback.is-error {
      color: #fca5a5;
    }
  `,
})
export class AdminOrdersPanelComponent implements OnInit {
  private readonly shop = inject(ShopService);

  readonly all = signal<PedidoAdmin[]>([]);
  readonly filter = signal<Filter>('PREPARAR');
  readonly loading = signal(true);
  /** El pedido con una petición en curso, para no pulsar dos veces. */
  readonly busy = signal<number | null>(null);
  readonly feedback = signal<{ text: string; error: boolean } | null>(null);

  readonly visible = computed(() => {
    const filter = this.filter();
    return filter === 'TODOS'
      ? this.all()
      : this.all().filter(({ pedido }) => FILTER_STATES[filter].includes(pedido.estado));
  });
  readonly toPrepare = computed(
    () => this.all().filter(({ pedido }) => pedido.estado === 'CONFIRMADO').length,
  );

  readonly filters: { value: Filter; label: string }[] = [
    { value: 'PREPARAR', label: 'Por preparar' },
    { value: 'CAMINO', label: 'En camino' },
    { value: 'PAGO', label: 'Pendientes de pago' },
    { value: 'CERRADOS', label: 'Cerrados' },
    { value: 'TODOS', label: 'Todos' },
  ];

  readonly stateLabels = ORDER_STATE_LABELS;
  readonly deliveryLabels = DELIVERY_LABELS;
  readonly price = formatPrice;

  ngOnInit(): void {
    this.load();
  }

  /** `keepFeedback`: tras un error se recarga sin borrar el aviso que lo explica. */
  load(keepFeedback = false): void {
    this.loading.set(true);
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
        this.feedback.set({ text: 'No se han podido cargar los pedidos.', error: true });
      },
    });
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
      },
      error: (err) => this.fail(err, 'No se ha podido cambiar el estado.'),
    });
  }

  cancel(order: PedidoAdmin): void {
    const { referencia, total } = order.pedido;
    const refund =
      order.pagadoEn && !order.reembolsado
        ? ` Se devolverán ${this.price(total)} a la tarjeta con la que se pagó.`
        : '';
    if (!confirm(`¿Anular el pedido ${referencia}?${refund} Sus unidades vuelven al almacén.`)) {
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
      },
      error: (err) => this.fail(err, 'No se ha podido anular el pedido.'),
    });
  }

  /** Lo que se acaba de hacer, para el aviso: «enviado», «entregado» o «recogido». */
  private doneLabel(order: PedidoAdmin): string {
    if (order.pedido.estado === 'ENVIADO') {
      return 'enviado';
    }
    return order.pedido.entrega === 'RECOGIDA' ? 'recogido' : 'entregado';
  }

  /** El cobro en pocas palabras: con tarjeta, devuelto, pendiente o sin cobro (demostración). */
  payment(order: PedidoAdmin): string {
    if (order.reembolsado) {
      return 'Reembolsado';
    }
    if (order.pagadoEn) {
      return 'Pagado con tarjeta';
    }
    if (order.pedido.estado === 'PENDIENTE_PAGO') {
      return 'Esperando el pago';
    }
    return 'Sin cobro (tienda de demostración)';
  }

  replyHref(order: PedidoAdmin): string {
    return `mailto:${order.correo}?subject=${encodeURIComponent(`Pedido ${order.pedido.referencia}`)}`;
  }

  private replace(updated: PedidoAdmin): void {
    this.all.update((list) =>
      list.map((item) => (item.pedido.idPedido === updated.pedido.idPedido ? updated : item)),
    );
    this.busy.set(null);
  }

  private fail(err: unknown, fallback: string): void {
    this.busy.set(null);
    const message = (err as { error?: { message?: string } }).error?.message;
    this.feedback.set({ text: message ?? fallback, error: true });
    // Lo más probable es que el pedido haya cambiado entretanto (un pago, el cliente que lo anula).
    this.load(true);
  }
}
