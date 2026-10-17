package retotransversal.modelo.entities;

/**
 * El cobro de una reserva, aparte de su estado (viva o cancelada) y del de su sesión. Las devoluciones
 * no son un estado: se guardan como importe devuelto, porque pueden ser parciales.
 */
public enum EstadoPago {
	/** Hecha en la web, esperando a Stripe: guarda sus plazas hasta que se paga o caduca el pago. */
	PENDIENTE,
	/** Pagada con tarjeta (o confirmada sin cobrar, si la web no tiene el pago activado). */
	PAGADA,
	/** Tomada desde el panel (por teléfono, por ejemplo): se cobra al llegar. */
	EN_TAQUILLA,
	/** Cobrada en taquilla. */
	COBRADA_TAQUILLA;

	/** Si ya hay dinero cobrado, que se pueda devolver. */
	public boolean cobrada() {
		return this == PAGADA || this == COBRADA_TAQUILLA;
	}
}
