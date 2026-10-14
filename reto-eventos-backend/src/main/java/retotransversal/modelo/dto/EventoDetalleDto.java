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
public class EventoDetalleDto {

	private Integer idEvento;
	private String nombre;
	private String descripcion;
	private LocalDate fechaInicio;
	private Integer duracion;
	private String direccion;
	private String estado;
	private Integer aforoMaximo;
	private Integer minimoAsistencia;
	private BigDecimal precio;
	private Integer idTipo;
	private String tipoEvento;
	/** El nombre de la foto propia, o null si usa la de la web. */
	private String imagen;

	public static EventoDetalleDto fromEntity(Evento evento) {
		return EventoDetalleDto.builder()
				.idEvento(evento.getIdEvento())
				.nombre(evento.getNombre())
				.descripcion(evento.getDescripcion())
				.fechaInicio(evento.getFechaInicio())
				.duracion(evento.getDuracion())
				.direccion(evento.getDireccion())
				.estado(evento.getEstado().name())
				.aforoMaximo(evento.getAforoMaximo())
				.minimoAsistencia(evento.getMinimoAsistencia())
				.precio(evento.getPrecio())
				.idTipo(evento.getTipoEvento().getIdTipo())
				.tipoEvento(evento.getTipoEvento().getNombre())
				.imagen(evento.getImagen())
				.build();
	}
}
