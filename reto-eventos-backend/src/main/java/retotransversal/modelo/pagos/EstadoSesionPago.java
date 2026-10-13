package retotransversal.modelo.pagos;

/** En qué quedó una sesión de pago; `pago` es el cobro hecho, para poder devolverlo. */
public record EstadoSesionPago(Estado estado, String pago) {

	public enum Estado {
		ABIERTA,
		PAGADA,
		CADUCADA
	}
}
