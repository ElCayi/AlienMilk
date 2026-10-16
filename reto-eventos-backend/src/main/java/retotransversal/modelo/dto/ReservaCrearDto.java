package retotransversal.modelo.dto;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Una reserva nueva. Desde la web llega con el registro de asistencia completo: un participante por
 * plaza, teléfono, adaptaciones, material externo y conformidad. Desde el panel (una reserva tomada por
 * teléfono, por ejemplo) bastan las plazas y las observaciones: los participantes quedan sin registrar.
 */
@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
public class ReservaCrearDto {

	private Integer cantidad;
	private String observaciones;

	private List<AsistenteDto> asistentes;
	private String telefono;
	private String adaptaciones;
	private boolean materialExterno;
	private String materialDescripcion;
	private boolean aceptaEdad;
	private boolean aceptaCondiciones;
	private boolean aceptaComunicaciones;
}
