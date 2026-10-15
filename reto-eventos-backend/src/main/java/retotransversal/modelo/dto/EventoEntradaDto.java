package retotransversal.modelo.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Datos de una sesión desde el formulario del panel; el estado no viaja aquí (ver AdminEventoRestController). */
@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
public class EventoEntradaDto {

	private String nombre;
	private String descripcion;
	private LocalDate fechaInicio;
	private LocalTime horaInicio;
	private Integer duracion;
	private String direccion;
	private Integer aforoMaximo;
	private Integer minimoAsistencia;
	private BigDecimal precio;
	private Integer idTipo;
}
