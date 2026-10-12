package retotransversal.modelo.pagos;

/** La pasarela no responde o rechaza la operación; el pedido no se toca. */
public class PagoNoDisponibleException extends RuntimeException {

	public PagoNoDisponibleException(String message, Throwable cause) {
		super(message, cause);
	}
}
