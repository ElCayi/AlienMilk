package retotransversal.modelo.dto;

import retotransversal.modelo.entities.EstadoPedido;

/** El paso que da el centro de distribución: ENVIADO o ENTREGADO. */
public record PedidoEstadoDto(EstadoPedido estado) {
}
