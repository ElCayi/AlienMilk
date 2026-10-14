package retotransversal.modelo.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Una capa del expediente de las sesiones (ver Expediente). Lo que una capa deja sin declarar (null)
 * lo hereda de la anterior; lo que declara lo sustituye, salvo {@code acceso} y {@code preguntas},
 * que se suman a los de las capas anteriores. Una lista vacía sí cuenta: deja el apartado sin nada.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ExpedienteCapaDto(
		String entradilla,
		List<String> texto,
		String procedencia,
		String horario,
		List<Campo> notasCata,
		List<Paso> programa,
		List<Campo> equipo,
		List<Campo> acceso,
		List<String> recomendaciones,
		List<Pregunta> preguntas,
		List<Colaborador> colaboradores,
		String creditos) {

	public static final ExpedienteCapaDto VACIA = new ExpedienteCapaDto(null, null, null, null, null, null, null,
			null, null, null, null, null);

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
