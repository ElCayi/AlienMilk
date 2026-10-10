package retotransversal.restcontroller;

import jakarta.servlet.http.HttpServletRequest;

/** De dónde viene una petición pública, para frenar los envíos masivos (LimitadorSolicitudes). */
final class OrigenPeticion {

	private OrigenPeticion() {
	}

	/**
	 * En producción el backend va detrás de Apache, que añade la dirección real del visitante al final
	 * de X-Forwarded-For; lo que venga antes lo pudo escribir el propio visitante.
	 */
	static String de(HttpServletRequest request) {
		String reenviado = request.getHeader("X-Forwarded-For");
		if (reenviado != null && !reenviado.isBlank()) {
			String[] saltos = reenviado.split(",");
			return saltos[saltos.length - 1].strip();
		}
		return request.getRemoteAddr();
	}
}
