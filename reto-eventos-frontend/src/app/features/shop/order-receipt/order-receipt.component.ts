import { Component, computed, ElementRef, input, viewChild } from '@angular/core';

import { Pedido } from '../../../models/api.models';
import { DELIVERY_LABELS, formatOrderDate, formatPrice, formatTime } from '../shop-format';

/** Una pieza de la fiesta: posición del centro (en % de la caja), tamaño y desfase del baile. */
interface PartyPiece {
  x: number;
  y: number;
  size: number;
  delay: number;
}

/**
 * La minimilk grande en el centro y la ronda de pequeñas alrededor, cada una con su desfase para que
 * no salten todas a la vez.
 */
const CROWD: readonly (PartyPiece & { lead?: boolean })[] = [
  { x: 50, y: 52, size: 9.5, delay: 0, lead: true },
  { x: 14, y: 30, size: 3.2, delay: -0.6 },
  { x: 24, y: 76, size: 2.6, delay: -1.5 },
  { x: 84, y: 26, size: 2.8, delay: -1.1 },
  { x: 77, y: 80, size: 3.4, delay: -2 },
  { x: 4, y: 62, size: 2.2, delay: -0.3 },
  { x: 96, y: 56, size: 2.4, delay: -1.8 },
];

/** Los corazones suben y se desvanecen, cada uno a su tiempo. */
const HEARTS: readonly PartyPiece[] = [
  { x: 33, y: 22, size: 1.1, delay: 0 },
  { x: 66, y: 14, size: 0.9, delay: -1.2 },
  { x: 92, y: 84, size: 0.8, delay: -2.1 },
  { x: 8, y: 14, size: 0.75, delay: -2.9 },
  { x: 40, y: 92, size: 0.85, delay: -0.7 },
];

/**
 * Resguardo de un pedido: el número en grande, qué pasa ahora y los importes. Lo usan la tienda, al
 * confirmar, y la página del pedido de invitado; cada una añade sus acciones dentro del resguardo.
 */
@Component({
  selector: 'app-order-receipt',
  standalone: true,
  templateUrl: './order-receipt.component.html',
  styleUrls: ['../shop-shared.css', './order-receipt.component.css'],
})
export class OrderReceiptComponent {
  readonly order = input.required<Pedido>();

  readonly crowd = CROWD;
  readonly hearts = HEARTS;

  /** La fiesta: el pedido está pagado y sigue adelante. */
  readonly happy = computed(() => ['CONFIRMADO', 'ENVIADO', 'ENTREGADO'].includes(this.order().estado));

  readonly deliveryLabels = DELIVERY_LABELS;
  readonly price = formatPrice;
  readonly time = formatTime;
  readonly date = formatOrderDate;

  private readonly box = viewChild.required<ElementRef<HTMLElement>>('box');

  /** El resguardo toma el foco al aparecer, como en los formularios. */
  focus(): void {
    this.box().nativeElement.focus();
  }
}
