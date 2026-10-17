package retotransversal.modelo.dto;

import java.util.List;

/**
 * Lo que se corrige de una reserva. Los campos a null se quedan como están: el cliente solo manda el
 * teléfono y los participantes; el admin puede cambiar además la sesión, las plazas, las observaciones,
 * las adaptaciones y el material. La conformidad no se toca nunca: es lo que firmó el cliente.
 */
public record ReservaEditarDto(String telefono, String observaciones, List<AsistenteDto> asistentes,
		Integer idEvento, Integer cantidad, String adaptaciones, Boolean materialExterno,
		String materialDescripcion) {

	public ReservaEditarDto(String telefono, String observaciones, List<AsistenteDto> asistentes) {
		this(telefono, observaciones, asistentes, null, null, null, null, null);
	}
}
