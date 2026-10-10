import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { ContactService } from '../../core/services/contact.service';
import { guestOrderLink, ShopService } from '../../core/services/shop.service';
import { CartService } from '../../features/shop/cart.service';
import { OrderReceiptComponent } from '../../features/shop/order-receipt/order-receipt.component';
import {
  CATEGORY_FILTERS,
  CATEGORY_LABELS,
  CategoryFilter,
  DELIVERY_LABELS,
  formatOrderDate,
  formatPrice,
  maxUnits,
  ORDER_STATE_LABELS,
  shippingCost,
  stockLabel,
  stockLevel,
} from '../../features/shop/shop-format';
import {
  ApiError,
  CatalogoTienda,
  EntregaPedido,
  Pedido,
  Producto,
} from '../../models/api.models';
import { FitLineDirective } from '../../shared/fit-line/fit-line.directive';

/** Una línea del pedido en curso, con el producto tal como lo trae el catálogo. */
interface CartLine {
  product: Producto;
  quantity: number;
  amount: number;
  max: number;
}

/**
 * Tienda: catálogo con filtro por categoría, pedido en curso y pedidos anteriores. El carrito vive
 * en el navegador (CartService); los importes que se cobran los calcula el servidor al confirmar.
 * Se compra con cuenta o como invitado; el invitado se lleva un enlace privado a su pedido.
 */
@Component({
  selector: 'app-shop-page',
  standalone: true,
  imports: [FitLineDirective, OrderReceiptComponent, RouterLink],
  templateUrl: './shop-page.component.html',
  styleUrls: [
    '../../shared/secondary-page/secondary-page.css',
    '../../features/shop/shop-shared.css',
    './shop-page.component.css',
  ],
})
export class ShopPageComponent {
  private readonly shop = inject(ShopService);
  private readonly contact = inject(ContactService);
  readonly cart = inject(CartService);
  readonly auth = inject(AuthService);

  readonly filters = CATEGORY_FILTERS;
  readonly categoryLabels = CATEGORY_LABELS;
  readonly deliveryLabels = DELIVERY_LABELS;
  readonly stateLabels = ORDER_STATE_LABELS;
  readonly price = formatPrice;
  readonly orderDate = formatOrderDate;
  readonly stockLabel = stockLabel;
  readonly stockLevel = stockLevel;
  readonly sede = this.contact.contacto;

  readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  readonly catalog = signal<CatalogoTienda | null>(null);
  readonly filter = signal<CategoryFilter>('TODO');

  readonly products = computed(() => this.catalog()?.productos ?? []);
  readonly visible = computed(() => {
    const filter = this.filter();
    return filter === 'TODO'
      ? this.products()
      : this.products().filter((product) => product.categoria === filter);
  });

  readonly lines = computed<CartLine[]>(() => {
    const catalog = this.catalog();
    if (!catalog) {
      return [];
    }
    const items = this.cart.items();
    return catalog.productos
      .filter((product) => items[product.slug])
      .map((product) => ({
        product,
        quantity: items[product.slug],
        amount: product.precio * items[product.slug],
        max: maxUnits(product, catalog.condiciones),
      }));
  });

  /** Líneas que piden más de lo que queda: se avisa antes de que el servidor lo rechace. */
  readonly shortLines = computed(() => this.lines().filter((line) => line.quantity > line.max));

  readonly deliveries: EntregaPedido[] = ['ENVIO', 'RECOGIDA'];
  readonly delivery = signal<EntregaPedido>('ENVIO');
  readonly address = signal('');
  readonly name = signal('');
  readonly email = signal('');
  readonly freeShippingFrom = computed(() => this.catalog()?.condiciones.envioGratisDesde ?? 0);
  readonly subtotal = computed(() => this.lines().reduce((total, line) => total + line.amount, 0));
  readonly shipping = computed(() => {
    const terms = this.catalog()?.condiciones;
    return terms ? shippingCost(this.delivery(), this.subtotal(), terms) : 0;
  });
  readonly total = computed(() => this.subtotal() + this.shipping());

  readonly sending = signal(false);
  readonly orderError = signal<string | null>(null);
  readonly addressError = signal<string | null>(null);
  readonly nameError = signal<string | null>(null);
  readonly emailError = signal<string | null>(null);
  readonly receipt = signal<Pedido | null>(null);
  readonly orders = signal<Pedido[]>([]);
  readonly cancelling = signal<number | null>(null);
  readonly linkCopied = signal(false);

  private readonly addressField = viewChild<ElementRef<HTMLTextAreaElement>>('addressField');
  private readonly nameField = viewChild<ElementRef<HTMLInputElement>>('nameField');
  private readonly emailField = viewChild<ElementRef<HTMLInputElement>>('emailField');
  private readonly receiptView = viewChild(OrderReceiptComponent);

  constructor() {
    this.loadCatalog();
    this.contact.load();

    // La sesión puede llegar después que la página (al recargar con la sesión guardada).
    effect(() => {
      const user = this.auth.currentUser();
      untracked(() => (user ? this.loadOrders() : this.orders.set([])));
    });

    // El resguardo toma el foco al aparecer, como en los formularios.
    effect(() => {
      if (this.receipt()) {
        setTimeout(() => this.receiptView()?.focus());
      }
    });
  }

  loadCatalog(refresh = false): void {
    if (!this.catalog()) {
      this.status.set('loading');
    }
    this.shop.catalog(refresh).subscribe({
      next: (catalog) => {
        this.catalog.set(catalog);
        this.status.set('ready');
      },
      error: () => this.status.set(this.catalog() ? 'ready' : 'error'),
    });
  }

  categoryCount(filter: CategoryFilter): number {
    return filter === 'TODO'
      ? this.products().length
      : this.products().filter((product) => product.categoria === filter).length;
  }

  quantity(product: Producto): number {
    return this.cart.quantity(product.slug);
  }

  max(product: Producto): number {
    const terms = this.catalog()?.condiciones;
    return terms ? maxUnits(product, terms) : 0;
  }

  add(product: Producto): void {
    this.receipt.set(null);
    this.cart.add(product.slug, this.max(product));
  }

  setQuantity(product: Producto, quantity: number): void {
    this.cart.set(product.slug, quantity, this.max(product));
  }

  setDelivery(delivery: EntregaPedido): void {
    this.delivery.set(delivery);
    this.addressError.set(null);
  }

  onAddressInput(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.address.set(value);
    if (value.trim()) {
      this.addressError.set(null);
    }
  }

  onNameInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.name.set(value);
    if (value.trim()) {
      this.nameError.set(null);
    }
  }

  onEmailInput(event: Event): void {
    this.email.set((event.target as HTMLInputElement).value);
    this.emailError.set(null);
  }

  confirm(): void {
    const lines = this.lines();
    if (!lines.length || this.sending()) {
      return;
    }
    const guest = !this.auth.isAuthenticated();
    const name = this.name().trim();
    const email = this.email().trim();
    const address = this.address().trim();

    // Todos los avisos a la vez, y el foco en el primer campo que falta, en el orden de la página.
    this.nameError.set(guest && !name ? 'Indique a nombre de quién va el pedido' : null);
    this.emailError.set(
      !guest
        ? null
        : !email
          ? 'Indique un correo para avisarle del pedido'
          : EMAIL.test(email)
            ? null
            : 'Escriba un correo válido',
    );
    this.addressError.set(
      this.delivery() === 'ENVIO' && !address ? 'Indique la dirección de entrega' : null,
    );
    const invalid = [
      { message: this.nameError(), field: this.nameField() },
      { message: this.emailError(), field: this.emailField() },
      { message: this.addressError(), field: this.addressField() },
    ].find((entry) => entry.message);
    if (invalid) {
      invalid.field?.nativeElement.focus();
      return;
    }

    this.sending.set(true);
    this.orderError.set(null);
    this.shop
      .placeOrder({
        lineas: lines.map((line) => ({ producto: line.product.slug, cantidad: line.quantity })),
        entrega: this.delivery(),
        direccion: this.delivery() === 'ENVIO' ? address : undefined,
        ...(guest ? { nombre: name, correo: email } : {}),
      })
      .subscribe({
        next: (pedido) => {
          this.sending.set(false);
          this.cart.clear();
          this.address.set('');
          this.linkCopied.set(false);
          this.receipt.set(pedido);
          if (!pedido.invitado) {
            this.orders.update((orders) => [pedido, ...orders]);
          }
          this.loadCatalog(true);
        },
        error: (error: HttpErrorResponse) => {
          this.sending.set(false);
          this.showOrderError(error);
        },
      });
  }

  /** El enlace privado de un pedido de invitado, mientras su resguardo está en pantalla. */
  guestLink(order: Pedido): string | null {
    return order.clave ? guestOrderLink(order, order.clave) : null;
  }

  copyLink(link: string): void {
    navigator.clipboard.writeText(link).then(
      () => this.linkCopied.set(true),
      () => this.linkCopied.set(false),
    );
  }

  /** Vuelve del resguardo al catálogo para empezar otro pedido. */
  newOrder(): void {
    this.receipt.set(null);
  }

  cancel(order: Pedido): void {
    const confirmed = window.confirm(
      `¿Anular el pedido ${order.referencia}? Las unidades vuelven al centro de distribución.`,
    );
    if (!confirmed) {
      return;
    }
    this.cancelling.set(order.idPedido);
    this.shop.cancelOrder(order.idPedido).subscribe({
      next: (cancelled) => {
        this.cancelling.set(null);
        this.orders.update((orders) =>
          orders.map((item) => (item.idPedido === cancelled.idPedido ? cancelled : item)),
        );
        if (this.receipt()?.idPedido === cancelled.idPedido) {
          this.receipt.set(cancelled);
        }
        this.loadCatalog(true);
      },
      error: (error: HttpErrorResponse) => {
        this.cancelling.set(null);
        window.alert((error.error as ApiError | null)?.message ?? 'No se ha podido anular el pedido.');
      },
    });
  }

  units(order: Pedido): number {
    return order.lineas.reduce((total, line) => total + line.cantidad, 0);
  }

  private loadOrders(): void {
    this.shop.myOrders().subscribe({
      next: (orders) => this.orders.set(orders),
      error: () => this.orders.set([]),
    });
  }

  private showOrderError(error: HttpErrorResponse): void {
    if (error.status === 401) {
      this.orderError.set('Su sesión ha caducado. Vuelva a iniciar sesión para confirmar el pedido.');
      return;
    }
    const body = error.error as ApiError | null;
    const errores = body?.errores ?? {};
    if (errores['nombre'] || errores['correo'] || errores['direccion']) {
      // Los errores de los campos van junto a cada uno; arriba solo lo que no tiene campo propio.
      this.nameError.set(errores['nombre'] ?? null);
      this.emailError.set(errores['correo'] ?? null);
      this.addressError.set(errores['direccion'] ?? null);
      this.orderError.set(errores['lineas'] ?? errores['entrega'] ?? null);
    } else {
      this.orderError.set(
        errores['lineas'] ??
          errores['entrega'] ??
          body?.message ??
          (error.status === 0
            ? 'No hay conexión con la tienda. Inténtelo de nuevo en unos minutos.'
            : 'No hemos podido confirmar el pedido. Inténtelo de nuevo.'),
      );
    }
    // Un conflicto de existencias: el catálogo se vuelve a pedir para ver lo que queda.
    if (error.status === 409) {
      this.loadCatalog(true);
    }
  }
}

/** La misma comprobación que hace el servidor: algo, una arroba, algo, un punto y algo. */
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
