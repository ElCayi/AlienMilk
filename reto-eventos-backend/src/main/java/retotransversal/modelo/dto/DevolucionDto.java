package retotransversal.modelo.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import retotransversal.modelo.entities.Devolucion;

/** Una devolución de una reserva, tal como se enseña en el panel y en Mi panel. */
public record DevolucionDto(Integer idDevolucion, BigDecimal importe, String medio, String estado, String motivo,
		String referencia, LocalDateTime creadaEn, LocalDateTime hechaEn) {

	public static DevolucionDto de(Devolucion devolucion) {
		return new DevolucionDto(devolucion.getIdDevolucion(), devolucion.getImporte(), devolucion.getMedio().name(),
				devolucion.getEstado().name(), devolucion.getMotivo(), devolucion.getReferencia(),
				devolucion.getCreadaEn(), devolucion.getHechaEn());
	}
}
