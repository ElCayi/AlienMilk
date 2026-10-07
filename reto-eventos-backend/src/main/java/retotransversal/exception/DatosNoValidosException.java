package retotransversal.exception;

import java.util.Map;

/** Valores de un formulario que no superan la validación, con un mensaje por campo. */
public class DatosNoValidosException extends RuntimeException {

	private final transient Map<String, String> errores;

	public DatosNoValidosException(Map<String, String> errores) {
		super("Revise los campos señalados");
		this.errores = Map.copyOf(errores);
	}

	public Map<String, String> getErrores() {
		return errores;
	}
}
