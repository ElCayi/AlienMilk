package retotransversal.modelo.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;

/**
 * Al arrancar, reparte en cada sesión lo que quede de las capas antiguas del expediente (común y por
 * tipo, hasta el 2026-10-15) y las borra. Con una base ya repartida no hace nada.
 */
@Component
@RequiredArgsConstructor
public class AplanadoExpedientes {

	private static final Logger log = LoggerFactory.getLogger(AplanadoExpedientes.class);

	private final ExpedienteService expedienteService;

	@EventListener(ApplicationReadyEvent.class)
	public void aplanar() {
		int sesiones = expedienteService.aplanarCapasAntiguas();
		if (sesiones > 0) {
			log.info("Expedientes: las capas común y por tipo se han repartido en {} sesiones", sesiones);
		}
	}
}
