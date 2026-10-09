import { computed, effect, Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'alienmilk-tienda-pedido';

/** Unidades de cada producto, por su slug. */
export type CartItems = Record<string, number>;

/**
 * El pedido en curso. Vive en el navegador (localStorage) para sobrevivir a una recarga o a un
 * inicio de sesión a mitad de compra; precios y existencias los pone siempre el servidor.
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  readonly items = signal<CartItems>(readStoredCart());
  /** Unidades en total, para el aviso del menú. */
  readonly units = computed(() => Object.values(this.items()).reduce((total, n) => total + n, 0));

  constructor() {
    effect(() => {
      const items = this.items();
      if (Object.keys(items).length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    });

    // Otra pestaña con la tienda abierta: las dos muestran el mismo pedido.
    window.addEventListener('storage', (event) => {
      if (event.key === STORAGE_KEY) {
        this.items.set(readStoredCart());
      }
    });
  }

  quantity(slug: string): number {
    return this.items()[slug] ?? 0;
  }

  /** Fija las unidades de un producto entre 0 (lo quita) y el máximo permitido. */
  set(slug: string, quantity: number, max: number): void {
    const units = Math.max(0, Math.min(Math.trunc(quantity), max));
    this.items.update((items) => {
      const rest = Object.fromEntries(Object.entries(items).filter(([key]) => key !== slug));
      return units > 0 ? { ...rest, [slug]: units } : rest;
    });
  }

  add(slug: string, max: number): void {
    this.set(slug, this.quantity(slug) + 1, max);
  }

  remove(slug: string): void {
    this.set(slug, 0, 0);
  }

  clear(): void {
    this.items.set({});
  }
}

function readStoredCart(): CartItems {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) {
      return {};
    }
    // Solo cantidades enteras y positivas: lo demás es un resto de otra versión o de otra mano.
    return Object.fromEntries(
      Object.entries(stored).filter(
        ([slug, units]) => typeof slug === 'string' && Number.isInteger(units) && (units as number) > 0,
      ),
    ) as CartItems;
  } catch {
    return {};
  }
}
