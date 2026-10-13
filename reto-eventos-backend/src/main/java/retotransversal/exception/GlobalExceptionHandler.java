package retotransversal.exception;

import java.time.LocalDateTime;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import jakarta.servlet.http.HttpServletRequest;
import retotransversal.modelo.pagos.AvisoPagoNoValidoException;
import retotransversal.modelo.pagos.PagoNoDisponibleException;

@RestControllerAdvice
public class GlobalExceptionHandler {

	private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

	@ExceptionHandler(RecursoNoEncontradoException.class)
	public ResponseEntity<ApiErrorResponse> handleNotFound(RecursoNoEncontradoException ex, HttpServletRequest request) {
		return buildResponse(HttpStatus.NOT_FOUND, ex.getMessage(), request.getRequestURI());
	}

	@ExceptionHandler(ConflictoNegocioException.class)
	public ResponseEntity<ApiErrorResponse> handleConflict(ConflictoNegocioException ex, HttpServletRequest request) {
		return buildResponse(HttpStatus.CONFLICT, ex.getMessage(), request.getRequestURI());
	}

	@ExceptionHandler(OperacionNoPermitidaException.class)
	public ResponseEntity<ApiErrorResponse> handleForbidden(OperacionNoPermitidaException ex,
			HttpServletRequest request) {
		return buildResponse(HttpStatus.FORBIDDEN, ex.getMessage(), request.getRequestURI());
	}

	@ExceptionHandler(DatosNoValidosException.class)
	public ResponseEntity<ApiErrorResponse> handleInvalidForm(DatosNoValidosException ex, HttpServletRequest request) {
		ResponseEntity<ApiErrorResponse> response = buildResponse(HttpStatus.BAD_REQUEST, ex.getMessage(),
				request.getRequestURI());
		response.getBody().setErrores(ex.getErrores());
		return response;
	}

	@ExceptionHandler(PagoNoDisponibleException.class)
	public ResponseEntity<ApiErrorResponse> handlePaymentUnavailable(PagoNoDisponibleException ex,
			HttpServletRequest request) {
		log.warn("Pasarela de pago: {}", ex.getMessage(), ex.getCause());
		return buildResponse(HttpStatus.BAD_GATEWAY, ex.getMessage(), request.getRequestURI());
	}

	/** Aviso de pago con la firma mal: no se dice más, para no ayudar a quien lo intenta. */
	@ExceptionHandler(AvisoPagoNoValidoException.class)
	public ResponseEntity<ApiErrorResponse> handleBadPaymentNotice(AvisoPagoNoValidoException ex,
			HttpServletRequest request) {
		log.warn("Aviso de pago rechazado: {}", ex.getMessage());
		return buildResponse(HttpStatus.BAD_REQUEST, "Aviso no válido", request.getRequestURI());
	}

	@ExceptionHandler(DemasiadasSolicitudesException.class)
	public ResponseEntity<ApiErrorResponse> handleTooMany(DemasiadasSolicitudesException ex, HttpServletRequest request) {
		return buildResponse(HttpStatus.TOO_MANY_REQUESTS, ex.getMessage(), request.getRequestURI());
	}

	@ExceptionHandler({
			IllegalArgumentException.class,
			MethodArgumentTypeMismatchException.class,
			MethodArgumentNotValidException.class
	})
	public ResponseEntity<ApiErrorResponse> handleBadRequest(Exception ex, HttpServletRequest request) {
		return buildResponse(HttpStatus.BAD_REQUEST, ex.getMessage(), request.getRequestURI());
	}

	/**
	 * Red de seguridad: la base de datos rechaza algo que los servicios no comprobaron (una clave ajena,
	 * un valor repetido). Mejor un 409 que se entienda que un error interno.
	 */
	@ExceptionHandler(DataIntegrityViolationException.class)
	public ResponseEntity<ApiErrorResponse> handleIntegrity(DataIntegrityViolationException ex,
			HttpServletRequest request) {
		log.warn("Restricción de la base de datos en {}: {}", request.getRequestURI(), ex.getMostSpecificCause().getMessage());
		return buildResponse(HttpStatus.CONFLICT, "No se puede guardar: hay datos relacionados que lo impiden",
				request.getRequestURI());
	}

	@ExceptionHandler(HttpRequestMethodNotSupportedException.class)
	public ResponseEntity<ApiErrorResponse> handleMethodNotAllowed(HttpRequestMethodNotSupportedException ex,
			HttpServletRequest request) {
		return buildResponse(HttpStatus.METHOD_NOT_ALLOWED, ex.getMessage(), request.getRequestURI());
	}

	@ExceptionHandler(Exception.class)
	public ResponseEntity<ApiErrorResponse> handleGeneric(Exception ex, HttpServletRequest request) {
		return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "Se ha producido un error interno",
				request.getRequestURI());
	}

	private ResponseEntity<ApiErrorResponse> buildResponse(HttpStatus status, String message, String path) {
		ApiErrorResponse body = ApiErrorResponse.builder()
				.timestamp(LocalDateTime.now())
				.status(status.value())
				.error(status.getReasonPhrase())
				.message(message)
				.path(path)
				.build();
		return ResponseEntity.status(status).body(body);
	}
}
