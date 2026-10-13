package retotransversal.modelo.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

import retotransversal.modelo.entities.EntregaPedido;
import retotransversal.modelo.entities.EstadoPedido;

/**
 * Un pedido tal como lo ve su comprador. `invitado` distingue los pedidos sin cuenta; `clave` solo
 * viaja una vez, en la respuesta que crea un pedido de invitado, porque el servidor no la guarda.
 * `pagoUrl` y `pagoCaducaEn`: dónde y hasta cuándo se puede pagar, solo mientras está pendiente.
 * `enviadoEn` y `entregadoEn`, cuando el centro de distribución lo ha hecho.
 */
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
		@JsonInclude(JsonInclude.Include.NON_NULL) LocalDateTime enviadoEn,
		@JsonInclude(JsonInclude.Include.NON_NULL) LocalDateTime entregadoEn,
		List<LineaPedidoDto> lineas,
		boolean invitado,
		String nombre,
		@JsonInclude(JsonInclude.Include.NON_NULL) String pagoUrl,
		@JsonInclude(JsonInclude.Include.NON_NULL) LocalDateTime pagoCaducaEn,
		@JsonInclude(JsonInclude.Include.NON_NULL) String clave) {
}
