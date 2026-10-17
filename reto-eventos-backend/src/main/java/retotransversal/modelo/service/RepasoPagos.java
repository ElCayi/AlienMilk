package retotransversal.modelo.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;

/**
 * Red de seguridad de los avisos de pago: cada cinco minutos pregunta a la pasarela por los pedidos
 * cuyo plazo de pago ya pasó. Si un aviso no llegó (el servidor estaba parado, la red falló), el
 * pedido pagado se confirma igual y el abandonado devuelve sus unidades al almacén. Lo mismo con las
 * reservas: la pagada se confirma y la abandonada libera sus plazas.
 */
@Component
@RequiredArgsConstructor
public class RepasoPagos {

	private static final Logger log = LoggerFactory.getLogger(RepasoPagos.class);

	private final TiendaService tiendaService;
	private final PagosReservasService pagosReservas;

	@Scheduled(initialDelayString = "PT1M", fixedDelayString = "PT5M")
	public void repasar() {
		for (Integer idPedido : tiendaService.pagosVencidos()) {
			try {
				tiendaService.repasarPago(idPedido);
			} catch (RuntimeException e) {
				log.warn("No se ha podido repasar el pago del pedido {}", idPedido, e);
			}
		}
		for (Integer idReserva : pagosReservas.pagosVencidos()) {
			try {
				pagosReservas.repasar(idReserva);
			} catch (RuntimeException e) {
				log.warn("No se ha podido repasar el pago de la reserva {}", idReserva, e);
			}
		}
	}
}
