package retotransversal.exception;

/** Se han recibido demasiadas solicitudes seguidas desde el mismo origen, o en total. */
public class DemasiadasSolicitudesException extends RuntimeException {

	public DemasiadasSolicitudesException(String message) {
		super(message);
	}
}
