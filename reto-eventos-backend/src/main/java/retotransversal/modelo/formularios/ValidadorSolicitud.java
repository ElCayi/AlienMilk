package retotransversal.modelo.formularios;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

import retotransversal.exception.DatosNoValidosException;

/**
 * Comprueba los valores de una solicitud contra la definición de su formulario. Reúne todos los
 * errores, uno por campo, para que el formulario pueda señalarlos a la vez.
 */
public final class ValidadorSolicitud {

	private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");

	private ValidadorSolicitud() {
	}

	/**
	 * @return los datos limpios, en el orden de la definición y con su etiqueta; los campos opcionales
	 *         vacíos no se incluyen
	 * @throws DatosNoValidosException si algún valor no es válido o hay campos que el formulario no tiene
	 */
	public static List<DatoSolicitud> validar(FormularioDefinicion definicion, Map<String, Object> valores,
			LocalDate hoy) {
		Map<String, Object> recibidos = valores == null ? Map.of() : valores;
		Map<String, String> errores = new LinkedHashMap<>();
		List<DatoSolicitud> datos = new ArrayList<>();

		for (String clave : recibidos.keySet()) {
			if (definicion.campos().stream().noneMatch(campo -> campo.clave().equals(clave))) {
				errores.put(clave, "Este formulario no tiene ese campo");
			}
		}

		for (CampoFormulario campo : definicion.campos()) {
			Object bruto = recibidos.get(campo.clave());
			String valor = bruto == null ? null : String.valueOf(bruto).strip();
			if (valor == null || valor.isEmpty()) {
				if (campo.requerido()) {
					errores.put(campo.clave(), "Este campo es obligatorio");
				}
				continue;
			}
			String error = comprobar(campo, valor, hoy);
			if (error != null) {
				errores.put(campo.clave(), error);
			} else {
				datos.add(new DatoSolicitud(campo.clave(), campo.etiqueta(), valor));
			}
		}

		if (!errores.isEmpty()) {
			throw new DatosNoValidosException(errores);
		}
		return datos;
	}

	private static String comprobar(CampoFormulario campo, String valor, LocalDate hoy) {
		return switch (campo.tipo()) {
			case TEXTO, TEXTO_LARGO -> longitud(campo, valor);
			case EMAIL -> {
				String error = longitud(campo, valor);
				yield error != null || EMAIL.matcher(valor).matches() ? error : "Escriba un correo válido";
			}
			case NUMERO -> numero(campo, valor);
			case FECHA -> fecha(campo, valor, hoy);
			case SELECCION -> campo.opciones().contains(valor) ? null : "Elija una de las opciones";
		};
	}

	private static String longitud(CampoFormulario campo, String valor) {
		int maximo = campo.longitudMaxima();
		return valor.length() > maximo ? "Admite como máximo " + maximo + " caracteres" : null;
	}

	private static String numero(CampoFormulario campo, String valor) {
		int numero;
		try {
			numero = Integer.parseInt(valor);
		} catch (NumberFormatException ex) {
			return "Escriba un número entero";
		}
		if (campo.minimo() != null && numero < campo.minimo()) {
			return "El mínimo es " + campo.minimo();
		}
		if (campo.maximo() != null && numero > campo.maximo()) {
			return "El máximo es " + campo.maximo();
		}
		return null;
	}

	private static String fecha(CampoFormulario campo, String valor, LocalDate hoy) {
		LocalDate fecha;
		try {
			fecha = LocalDate.parse(valor);
		} catch (DateTimeParseException ex) {
			return "Escriba una fecha válida";
		}
		return Boolean.TRUE.equals(campo.desdeHoy()) && fecha.isBefore(hoy) ? "La fecha no puede haber pasado" : null;
	}
}
