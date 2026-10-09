package retotransversal.modelo.entities;

/** Un pedido nace confirmado; solo se puede anular mientras no ha salido del centro de distribución. */
public enum EstadoPedido {
	CONFIRMADO,
	ENVIADO,
	ENTREGADO,
	ANULADO
}
