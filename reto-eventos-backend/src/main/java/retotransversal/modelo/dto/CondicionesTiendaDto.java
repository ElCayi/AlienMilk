package retotransversal.modelo.dto;

import java.math.BigDecimal;

/**
 * Las reglas con las que el servidor calcula un pedido. El frontend las recibe con el catálogo para
 * anunciar lo mismo que luego se cobra, sin tener las cifras duplicadas. `pagoConTarjeta` dice si
 * se paga en Stripe o si la tienda confirma sin cobrar (demostración).
 */
public record CondicionesTiendaDto(BigDecimal gastosEnvio, BigDecimal envioGratisDesde, int unidadesMaximas,
		boolean pagoConTarjeta) {
}
