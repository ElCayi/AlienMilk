package retotransversal.modelo.formularios;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Definición de un formulario público. Vive en resources/formularios/&lt;clave&gt;.json y es la única
 * fuente de verdad: el backend valida contra ella, el frontend la pinta y el panel de admin muestra
 * los datos con sus etiquetas. Un formulario nuevo, o un campo distinto, es otro JSON.
 *
 * @param clave        identificador en la URL: /api/formularios/{clave}
 * @param titulo       título del formulario
 * @param organizacion quién recibe la solicitud (un operador, la oficina de atención…)
 * @param prefijo      inicio del número de resguardo, de dos a cuatro mayúsculas (AMT-2026-0042)
 * @param introduccion texto breve sobre el formulario
 * @param accion       texto del botón de envío
 * @param confirmacion texto que acompaña al resguardo una vez enviada la solicitud
 * @param campos       los campos, en orden
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record FormularioDefinicion(
		String clave,
		String titulo,
		String organizacion,
		String prefijo,
		String introduccion,
		String accion,
		String confirmacion,
		List<CampoFormulario> campos) {
}
