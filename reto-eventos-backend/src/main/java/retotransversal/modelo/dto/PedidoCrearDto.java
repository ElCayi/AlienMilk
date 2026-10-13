package retotransversal.modelo.dto;

import java.util.List;

import retotransversal.modelo.entities.EntregaPedido;

/** Un pedido nuevo. `nombre` y `correo` solo cuentan sin sesión, en los pedidos de invitado. */
public record PedidoCrearDto(List<LineaPedidoCrearDto> lineas, EntregaPedido entrega, String direccion,
		String nombre, String correo) {
}
