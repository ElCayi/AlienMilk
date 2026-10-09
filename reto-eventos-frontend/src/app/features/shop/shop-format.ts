import {
  CategoriaProducto,
  CondicionesTienda,
  EntregaPedido,
  EstadoPedido,
  Producto,
} from '../../models/api.models';

export type CategoryFilter = CategoriaProducto | 'TODO';

export const CATEGORY_LABELS: Record<CategoriaProducto, string> = {
  LECHE: 'Leches',
  DERIVADO: 'Derivados',
  MESA: 'Mesa',
};

export const CATEGORY_FILTERS: { value: CategoryFilter; label: string }[] = [
  { value: 'TODO', label: 'Todo' },
  { value: 'LECHE', label: CATEGORY_LABELS.LECHE },
  { value: 'DERIVADO', label: CATEGORY_LABELS.DERIVADO },
  { value: 'MESA', label: CATEGORY_LABELS.MESA },
];

export const DELIVERY_LABELS: Record<EntregaPedido, string> = {
  ENVIO: 'Envío refrigerado',
  RECOGIDA: 'Recogida en sede',
};

export const ORDER_STATE_LABELS: Record<EstadoPedido, string> = {
  CONFIRMADO: 'Confirmado',
  ENVIADO: 'En camino',
  ENTREGADO: 'Entregado',
  ANULADO: 'Anulado',
};

const PRICE = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const ORDER_DATE = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

export function formatPrice(amount: number): string {
  return PRICE.format(amount);
}

export function formatOrderDate(isoDate: string): string {
  return ORDER_DATE.format(new Date(isoDate));
}

export type StockLevel = 'out' | 'low' | 'ok';

/** Por debajo de esta cifra, la tienda avisa de que quedan pocas unidades. */
const LOW_STOCK = 10;

export function stockLevel(product: Producto): StockLevel {
  if (product.existencias <= 0) {
    return 'out';
  }
  return product.existencias <= LOW_STOCK ? 'low' : 'ok';
}

/** Disponibilidad en pocas palabras, para el catálogo. */
export function stockLabel(product: Producto): string {
  switch (stockLevel(product)) {
    case 'out':
      return 'Agotado';
    case 'low':
      return product.existencias === 1 ? 'Última unidad' : `Últimas ${product.existencias} unidades`;
    default:
      return `${product.existencias} unidades`;
  }
}

/** Unidades que se pueden pedir de un producto: las que quedan, sin pasar del máximo por pedido. */
export function maxUnits(product: Producto, terms: CondicionesTienda): number {
  return Math.max(0, Math.min(product.existencias, terms.unidadesMaximas));
}

/** Los mismos gastos que calculará el servidor; aquí solo para anunciarlos antes de confirmar. */
export function shippingCost(delivery: EntregaPedido, subtotal: number, terms: CondicionesTienda): number {
  return delivery === 'RECOGIDA' || subtotal >= terms.envioGratisDesde ? 0 : terms.gastosEnvio;
}
