import { Component, ElementRef, input, viewChild } from '@angular/core';

import { Pedido } from '../../../models/api.models';
import { DELIVERY_LABELS, formatPrice } from '../shop-format';

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

  readonly deliveryLabels = DELIVERY_LABELS;
  readonly price = formatPrice;

  private readonly box = viewChild.required<ElementRef<HTMLElement>>('box');

  /** El resguardo toma el foco al aparecer, como en los formularios. */
  focus(): void {
    this.box().nativeElement.focus();
  }
}
