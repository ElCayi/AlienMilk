package retotransversal.modelo.formularios;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import retotransversal.exception.DatosNoValidosException;

class ValidadorSolicitudTest {

	private static final LocalDate HOY = LocalDate.of(2026, 10, 7);

	private static final FormularioDefinicion FORMULARIO = new FormularioDefinicion("prueba", "Prueba", "Pruebas",
			"PR", null, "Enviar", "Recibida.", List.of(
					campo("nombre", TipoCampo.TEXTO, true, null, 10, null, null),
					campo("email", TipoCampo.EMAIL, true, null, null, null, null),
					campo("plazas", TipoCampo.NUMERO, true, 1, 12, null, null),
					campo("fecha", TipoCampo.FECHA, false, null, null, null, true),
					campo("linea", TipoCampo.SELECCION, false, null, null, List.of("A1", "N"), null),
					campo("nota", TipoCampo.TEXTO_LARGO, false, null, null, null, null)));

	@Test
	void returnsCleanDataInDefinitionOrderAndSkipsEmptyOptionalFields() {
		List<DatoSolicitud> datos = ValidadorSolicitud.validar(FORMULARIO, Map.of(
				"plazas", 3,
				"email", " ana@example.invalid ",
				"nombre", "Ana",
				"linea", "N",
				"nota", "  "), HOY);

		assertThat(datos).extracting(DatoSolicitud::clave).containsExactly("nombre", "email", "plazas", "linea");
		assertThat(datos).extracting(DatoSolicitud::valor)
				.containsExactly("Ana", "ana@example.invalid", "3", "N");
		assertThat(datos.get(2).etiqueta()).isEqualTo("Etiqueta de plazas");
	}

	@Test
	void reportsEveryInvalidFieldAtOnce() {
		DatosNoValidosException error = catchThrowableOfType(DatosNoValidosException.class,
				() -> ValidadorSolicitud.validar(FORMULARIO, Map.of(
						"nombre", "Un nombre demasiado largo",
						"email", "sin-arroba",
						"plazas", "13",
						"fecha", "2026-10-06",
						"linea", "L9",
						"intruso", "x"), HOY));

		assertThat(error.getErrores()).containsOnlyKeys("nombre", "email", "plazas", "fecha", "linea", "intruso");
		assertThat(error.getErrores().get("plazas")).isEqualTo("El máximo es 12");
		assertThat(error.getErrores().get("fecha")).isEqualTo("La fecha no puede haber pasado");
	}

	@Test
	void requiresMandatoryFieldsAndWholeNumbers() {
		DatosNoValidosException error = catchThrowableOfType(DatosNoValidosException.class,
				() -> ValidadorSolicitud.validar(FORMULARIO, Map.of("plazas", "2,5"), HOY));

		assertThat(error.getErrores()).containsEntry("nombre", "Este campo es obligatorio")
				.containsEntry("email", "Este campo es obligatorio")
				.containsEntry("plazas", "Escriba un número entero");
	}

	private static CampoFormulario campo(String clave, TipoCampo tipo, boolean requerido, Integer minimo,
			Integer maximo, List<String> opciones, Boolean desdeHoy) {
		return new CampoFormulario(clave, "Etiqueta de " + clave, tipo, requerido, minimo, maximo, opciones,
				desdeHoy, null, null, null);
	}
}
