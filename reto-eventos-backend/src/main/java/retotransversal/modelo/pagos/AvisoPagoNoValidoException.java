package retotransversal.modelo.pagos;

/** Aviso con la firma mal o ilegible: no viene de la pasarela, o no se puede creer. */
public class AvisoPagoNoValidoException extends RuntimeException {

	public AvisoPagoNoValidoException(String message, Throwable cause) {
		super(message, cause);
	}
}
