package retotransversal.modelo.entities;

/**
 * Con pago, un pedido nace PENDIENTE_PAGO con sus unidades reservadas y pasa a CONFIRMADO cuando se
 * cobra; sin pago (tienda de demostración) nace confirmado. Se puede anular mientras no ha salido del
 * centro de distribución.
 */
public enum EstadoPedido {
	PENDIENTE_PAGO,
	CONFIRMADO,
	ENVIADO,
	ENTREGADO,
	ANULADO
}
