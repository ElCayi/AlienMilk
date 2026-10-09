package retotransversal.modelo.dto;

import java.math.BigDecimal;

public record LineaPedidoDto(String producto, String nombre, BigDecimal precioUnitario, int cantidad,
		BigDecimal importe) {
}
