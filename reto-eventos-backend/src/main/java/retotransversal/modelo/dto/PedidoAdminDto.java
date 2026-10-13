package retotransversal.modelo.dto;

import java.time.LocalDateTime;

import retotransversal.modelo.entities.EstadoPedido;

/**
 * Un pedido tal como lo ve el centro de distribución: el del comprador y, además, quién lo hizo, a
 * qué correo escribirle y cómo va el cobro. `cuenta` es el usuario, o vacío en los de invitado;
 * `pagadoEn`, cuándo se cobró con tarjeta (vacío en la tienda de demostración). `siguiente` es el
 * paso que le toca (vacío si ya no le queda ninguno) y `anulable`, si aún se puede anular: las reglas
 * las pone el servidor y el panel solo enseña los botones que corresponden.
 */
public record PedidoAdminDto(
		PedidoDto pedido,
		String cuenta,
		String correo,
		LocalDateTime pagadoEn,
		boolean reembolsado,
		EstadoPedido siguiente,
		boolean anulable) {
}
