package retotransversal.modelo.dto;

/** Una línea del carrito: qué producto (su slug) y cuántas unidades. El precio no viaja: lo pone el servidor. */
public record LineaPedidoCrearDto(String producto, Integer cantidad) {
}
