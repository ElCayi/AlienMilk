package retotransversal.modelo.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import retotransversal.modelo.entities.EntregaPedido;
import retotransversal.modelo.entities.EstadoPedido;

public record PedidoDto(
		Integer idPedido,
		String referencia,
		EstadoPedido estado,
		EntregaPedido entrega,
		String direccion,
		BigDecimal subtotal,
		BigDecimal gastosEnvio,
		BigDecimal total,
		LocalDateTime creadoEn,
		LocalDateTime anuladoEn,
		List<LineaPedidoDto> lineas) {
}
