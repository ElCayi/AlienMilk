package retotransversal.modelo.dto;

import java.util.List;

import retotransversal.modelo.entities.EntregaPedido;

public record PedidoCrearDto(List<LineaPedidoCrearDto> lineas, EntregaPedido entrega, String direccion) {
}
