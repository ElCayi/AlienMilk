package retotransversal.modelo.service;

import java.util.LinkedHashMap;
import java.util.Map;

import retotransversal.exception.DatosNoValidosException;

/**
 * Errores de un formulario del panel de administración, uno por campo, con la misma forma que los
 * del molde de formularios: el panel los coloca junto a cada campo. Se reúnen todos y se lanzan a
 * la vez, para que quien escribe vea de una vez todo lo que falta.
 */
public final class ErroresCampos {

	private final Map<String, String> errores = new LinkedHashMap<>();

	/** Texto obligatorio que no pase de {@code maximo} caracteres. */
	public ErroresCampos obligatorio(String campo, String valor, int maximo, String siFalta) {
		if (valor == null || valor.isBlank()) {
			anotar(campo, siFalta);
		} else {
			maximo(campo, valor, maximo);
		}
		return this;
	}

	/** Texto opcional que, si llega, no pase de {@code maximo} caracteres. */
	public ErroresCampos maximo(String campo, String valor, int maximo) {
		if (valor != null && valor.strip().length() > maximo) {
			anotar(campo, "Como máximo %d caracteres".formatted(maximo));
		}
		return this;
	}

	/** Anota el error si se cumple la condición; el primero de cada campo es el que se ve. */
	public ErroresCampos si(boolean condicion, String campo, String mensaje) {
		if (condicion) {
			anotar(campo, mensaje);
		}
		return this;
	}

	public boolean tiene(String campo) {
		return errores.containsKey(campo);
	}

	public void lanzarSiHay() {
		if (!errores.isEmpty()) {
			throw new DatosNoValidosException(errores);
		}
	}

	private void anotar(String campo, String mensaje) {
		errores.putIfAbsent(campo, mensaje);
	}

	/** Texto sin espacios sobrantes; vacío pasa a null para no guardar cadenas en blanco. */
	public static String limpio(String valor) {
		if (valor == null) {
			return null;
		}
		String limpio = valor.strip();
		return limpio.isEmpty() ? null : limpio;
	}
}
