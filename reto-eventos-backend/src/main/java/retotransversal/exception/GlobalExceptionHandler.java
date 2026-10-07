package retotransversal.exception;

import java.time.LocalDateTime;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import jakarta.servlet.http.HttpServletRequest;

@RestControllerAdvice
public class GlobalExceptionHandler {

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
