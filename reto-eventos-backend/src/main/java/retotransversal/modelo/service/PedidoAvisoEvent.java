package retotransversal.modelo.service;

import retotransversal.modelo.dto.PedidoDto;

/**
 * Se publica cada vez que un pedido cambia de un modo que su comprador debe saber. Lo escucha el
 * correo al cliente ({@link AvisoPedidos}) después de confirmar la transacción.
 *
 * @param motivo      qué ha pasado
 * @param pedido      el pedido ya cambiado
 * @param correo      a quién se escribe: el correo de la cuenta o el que dio el invitado
 * @param nombre      cómo se le saluda
 * @param enlace      dónde ver el pedido: el enlace privado (solo al recibirlo, que es cuando se
 *                    conoce la clave) o Mi panel; vacío si no hay ninguno que dar
 * @param reembolsado si al anular se devolvió el pago
 */
public record PedidoAvisoEvent(Motivo motivo, PedidoDto pedido, String correo, String nombre, String enlace,
		boolean reembolsado) {

	public enum Motivo {
		/** Recién hecho: confirmado o, con pago, reservado a la espera de pagarlo. */
		RECIBIDO,
		/** Pagado después de hacerlo. */
		PAGADO,
		ENVIADO,
		/** Entregado en su dirección o recogido en la sede. */
		ENTREGADO,
		/** Anulado por el comprador o por el centro de distribución. */
		ANULADO,
		/** Anulado solo porque nadie lo pagó a tiempo. */
		CADUCADO
	}
}
