import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { ShopService } from '../../core/services/shop.service';
import { CartService } from '../../features/shop/cart.service';
import {
  CATEGORY_LABELS,
  formatPrice,
  maxUnits,
  stockLevel,
} from '../../features/shop/shop-format';
import { CatalogoTienda, Producto } from '../../models/api.models';
import { FitLineDirective } from '../../shared/fit-line/fit-line.directive';

/**
 * Ficha de un producto de la tienda. Lee el mismo catálogo que la tienda (se pide una vez), así que
 * pasar de una ficha a otra es inmediato; el pedido se hace en la tienda.
 */
@Component({
  selector: 'app-product-page',
  standalone: true,
  imports: [FitLineDirective, RouterLink],
  templateUrl: './product-page.component.html',
  styleUrls: [
    '../../shared/secondary-page/secondary-page.css',
    '../../features/shop/shop-shared.css',
    './product-page.component.css',
  ],
})
export class ProductPageComponent {
  private readonly shop = inject(ShopService);
  readonly cart = inject(CartService);

  readonly categoryLabels = CATEGORY_LABELS;
  readonly price = formatPrice;

  /** La misma página sirve a todas las fichas: el producto cambia con la ruta, sin recrearla. */
  private readonly slug = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((params) => params.get('slug') ?? '')),
    { initialValue: '' },
  );

  readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  readonly catalog = signal<CatalogoTienda | null>(null);

  readonly product = computed(() =>
    this.catalog()?.productos.find((product) => product.slug === this.slug()),
  );
  /** Los productos de la misma sección, en el orden del catálogo, para el recuadro del cierre. */
  readonly shelf = computed(() => {
    const product = this.product();
    return (this.catalog()?.productos ?? []).filter((other) => other.categoria === product?.categoria);
  });
  readonly max = computed(() => {
    const product = this.product();
    const terms = this.catalog()?.condiciones;
    return product && terms ? maxUnits(product, terms) : 0;
  });
  readonly quantity = computed(() => {
    const product = this.product();
    return product ? this.cart.quantity(product.slug) : 0;
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.status.set('loading');
    this.shop.catalog().subscribe({
      next: (catalog) => {
        this.catalog.set(catalog);
        this.status.set('ready');
      },
      error: () => this.status.set('error'),
    });
  }

  stock(product: Producto): string {
    switch (stockLevel(product)) {
      case 'out':
        return 'Agotado. El próximo lote se anunciará en la tienda';
      case 'low':
        return product.existencias === 1
          ? 'Queda una unidad en el centro de distribución'
          : `Quedan ${product.existencias} unidades en el centro de distribución`;
      default:
        return `${product.existencias} unidades en el centro de distribución`;
    }
  }

  level(product: Producto): string {
    return stockLevel(product);
  }

  add(product: Producto): void {
    this.cart.add(product.slug, this.max());
  }

  setQuantity(product: Producto, quantity: number): void {
    this.cart.set(product.slug, quantity, this.max());
  }
}
