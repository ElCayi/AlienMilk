import { Pedido } from '../../models/api.models';

const STORAGE_KEY = 'alienmilk-tienda-pago';

/** El pedido que se está pagando en Stripe, para reconocerlo al volver a la tienda. */
export interface PendingPayment {
  referencia: string;
  idPedido: number;
  /** Solo en los pedidos de invitado: la clave de su enlace privado. */
  clave?: string;
}

/**
 * Antes de salir hacia la página de pago. Vive en sessionStorage: solo esta pestaña lo ve y se
 * borra al cerrarla, así que la clave de un invitado no se queda guardada en el navegador.
 */
export function rememberPayment(order: Pedido, key?: string): void {
  const pending: PendingPayment = { referencia: order.referencia, idPedido: order.idPedido };
  if (key) {
    pending.clave = key;
  }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
}

/** Al volver de la página de pago: el pedido que se estaba pagando, una sola vez. */
export function takePayment(): PendingPayment | null {
  const stored = sessionStorage.getItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
  try {
    const pending = JSON.parse(stored ?? 'null') as PendingPayment | null;
    return pending && typeof pending.referencia === 'string' && Number.isInteger(pending.idPedido)
      ? pending
      : null;
  } catch {
    return null;
  }
}
