package retotransversal.modelo.pagos;

import java.math.BigDecimal;

import retotransversal.modelo.entities.Pedido;

/**
 * El cobro de los pedidos de la tienda y de las reservas de sesiones. La tarjeta nunca pasa por este servidor: el comprador paga
 * en la página de la pasarela y vuelve. Aquí solo se abre la sesión de pago, se pregunta en qué
 * quedó y se devuelve el dinero al anular. Implementación: {@link StripePasarela}.
 */
public interface PasarelaPago {

	/** Abre el pago de un pedido ya guardado, por su total. Caduca a los 30 minutos. */
	SesionPago abrir(Pedido pedido, String correo);

	/**
	 * Abre el pago de una reserva: tantas plazas de una sesión a su precio. Caduca a los 30 minutos.
	 * `vuelta` es la ruta de la web adonde vuelve quien paga (o se arrepiente), sin el dominio.
	 */
	SesionPago abrirReserva(String referencia, String concepto, BigDecimal precioPlaza, int plazas, String correo,
			String vuelta);

	/** En qué quedó una sesión. Es la fuente de verdad: los avisos solo dicen que algo ha cambiado. */
	EstadoSesionPago consultar(String sesion);

	/** Cierra una sesión aún abierta, para que ya no se pueda pagar. */
	void caducar(String sesion);

	/** Devuelve entero un pago hecho. */
	String reembolsar(String pago);

	/**
	 * Devuelve una parte de un pago hecho. `clave` distingue una devolución de otra del mismo pago: la
	 * misma clave repetida (un reintento) no devuelve dos veces.
	 */
	String reembolsar(String pago, BigDecimal importe, String clave);

	/**
	 * Comprueba la firma de un aviso (webhook) y dice de qué sesión habla.
	 *
	 * @throws AvisoPagoNoValidoException si la firma no es de la pasarela o el aviso no se entiende
	 */
	AvisoPago leerAviso(String cuerpo, String firma);
}
