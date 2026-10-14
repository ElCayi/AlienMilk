package retotransversal.modelo.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import retotransversal.modelo.entities.Evento;

@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
public class EventoListadoDto {

	private Integer idEvento;
	private String nombre;
	private LocalDate fechaInicio;
	private BigDecimal precio;
	private Integer aforoMaximo;
	private String estado;
	private String tipoEvento;
	/** El nombre de la foto propia, o null si usa la de la web. */
	private String imagen;

	public static EventoListadoDto fromEntity(Evento evento) {
		return EventoListadoDto.builder()
				.idEvento(evento.getIdEvento())
				.nombre(evento.getNombre())
				.fechaInicio(evento.getFechaInicio())
				.precio(evento.getPrecio())
				.aforoMaximo(evento.getAforoMaximo())
				.estado(evento.getEstado().name())
				.tipoEvento(evento.getTipoEvento().getNombre())
				.imagen(evento.getImagen())
				.build();
	}
}
