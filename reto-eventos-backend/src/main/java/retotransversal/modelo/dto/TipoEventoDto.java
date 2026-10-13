package retotransversal.modelo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import retotransversal.modelo.entities.TipoEvento;

@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
public class TipoEventoDto {

	private Integer idTipo;
	private String nombre;
	private String descripcion;
	/** Sesiones de este tipo; con alguna, el tipo no se puede borrar. */
	private long sesiones;

	public static TipoEventoDto fromEntity(TipoEvento tipoEvento, long sesiones) {
		return TipoEventoDto.builder()
				.idTipo(tipoEvento.getIdTipo())
				.nombre(tipoEvento.getNombre())
				.descripcion(tipoEvento.getDescripcion())
				.sesiones(sesiones)
				.build();
	}
}
