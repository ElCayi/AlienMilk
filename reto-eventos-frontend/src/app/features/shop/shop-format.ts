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
  PENDIENTE_PAGO: 'Pendiente de pago',
  CONFIRMADO: 'Confirmado',
  ENVIADO: 'En camino',
  ENTREGADO: 'Entregado',
  ANULADO: 'Anulado',
};

const PRICE = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const ORDER_DATE = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
const ORDER_TIME = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' });

export function formatPrice(amount: number): string {
  return PRICE.format(amount);
}

export function formatOrderDate(isoDate: string): string {
  return ORDER_DATE.format(new Date(isoDate));
}

/** Hora y minutos, para el plazo de pago: «12:30». */
export function formatTime(isoDate: string): string {
  return ORDER_TIME.format(new Date(isoDate));
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

/** Sin tildes ni mayúsculas: «leche pelagia» encuentra «Leche de Pelagia». */
function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/**
 * Productos de una categoría que contienen todas las palabras buscadas, en el nombre, la
 * categoría, el formato, la procedencia o el resumen.
 */
export function filterProducts(
  products: Producto[],
  query: string,
  category: CategoryFilter,
): Producto[] {
  const words = normalizeSearch(query).split(/\s+/).filter(Boolean);
  return products.filter((product) => {
    if (category !== 'TODO' && product.categoria !== category) {
      return false;
    }
    const searchable = normalizeSearch(
      [
        product.nombre,
        CATEGORY_LABELS[product.categoria],
        product.formato,
        product.procedencia,
        product.resumen,
      ].join(' '),
    );
    return words.every((word) => searchable.includes(word));
  });
}
