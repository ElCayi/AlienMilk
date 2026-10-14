package retotransversal.modelo.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;

/**
 * Da por terminadas las sesiones activas cuya fecha ya pasó: cada noche, recién cambiado el día en
 * Madrid, y también al arrancar, por si el servidor estuvo parado a medianoche. Una sesión terminada
 * deja de admitir reservas y de salir en la web pública; las canceladas siguen canceladas.
 */
@Component
@RequiredArgsConstructor
public class CierreSesiones {

	private static final Logger log = LoggerFactory.getLogger(CierreSesiones.class);

	private final EventoService eventoService;

	@EventListener(ApplicationReadyEvent.class)
	@Scheduled(cron = "0 5 0 * * *", zone = "Europe/Madrid")
	public void cerrar() {
		try {
			int terminadas = eventoService.terminarCelebradas();
			if (terminadas > 0) {
				log.info("{} sesiones celebradas pasan a terminadas", terminadas);
			}
		} catch (RuntimeException e) {
			log.warn("No se han podido cerrar las sesiones celebradas", e);
		}
	}
}
