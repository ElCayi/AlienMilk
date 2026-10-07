package retotransversal.modelo.formularios;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Un campo de un formulario público.
 *
 * @param clave        nombre del dato en la solicitud; «nombre» y «email» son obligatorios en todo formulario
 * @param etiqueta     texto que ve el visitante y que se guarda junto al valor
 * @param tipo         cómo se valida y se pinta
 * @param requerido    si puede quedar vacío
 * @param minimo       para números, el valor mínimo
 * @param maximo       para números, el valor máximo; para textos, la longitud máxima
 * @param opciones     para selecciones, los valores admitidos
 * @param desdeHoy     para fechas, si debe ser hoy o posterior
 * @param ayuda        texto breve bajo el campo
 * @param ancho        «mitad» para compartir fila con el siguiente campo en pantallas anchas
 * @param autocompletar valor del atributo autocomplete del navegador
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record CampoFormulario(
		String clave,
		String etiqueta,
		TipoCampo tipo,
		boolean requerido,
		Integer minimo,
		Integer maximo,
		List<String> opciones,
		Boolean desdeHoy,
		String ayuda,
		String ancho,
		String autocompletar) {

	/** Longitud máxima de un texto cuando la definición no la fija. */
	public int longitudMaxima() {
		if (maximo != null) {
			return maximo;
		}
		return tipo == TipoCampo.TEXTO_LARGO ? 1000 : 120;
	}
}
