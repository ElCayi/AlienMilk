package retotransversal.modelo.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * El expediente de una sesión (ver Expediente): lo que enseña su ficha pública además de los datos de
 * la sesión. Un apartado sin declarar (null) no sale; la ficha pone en su lugar lo que tenga la sesión
 * (su descripción) o nada. El horario no está aquí: sale de la hora y la duración de la sesión.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ExpedienteCapaDto(
		String entradilla,
		List<String> texto,
		String procedencia,
		List<Campo> notasCata,
		List<Paso> programa,
		List<Campo> equipo,
		List<Campo> acceso,
		List<String> recomendaciones,
		List<Pregunta> preguntas,
		List<Colaborador> colaboradores,
		String creditos) {

	public static final ExpedienteCapaDto VACIA = new ExpedienteCapaDto(null, null, null, null, null, null, null,
			null, null, null, null);

	@JsonInclude(JsonInclude.Include.NON_NULL)
	public record Campo(String etiqueta, String valor) {
	}

	@JsonInclude(JsonInclude.Include.NON_NULL)
	public record Paso(String hora, String titulo, String detalle) {
	}

	@JsonInclude(JsonInclude.Include.NON_NULL)
	public record Pregunta(String pregunta, String respuesta) {
	}

	@JsonInclude(JsonInclude.Include.NON_NULL)
	public record Colaborador(String rol, String nombre, String detalle) {
	}
}
