package retotransversal.modelo.service;

import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

import lombok.extern.slf4j.Slf4j;

/** Deja constancia en el log de cada solicitud guardada, una vez confirmada en la base de datos. */
@Slf4j
@Component
public class RegistroSolicitudes {

	@TransactionalEventListener
	public void alRecibir(SolicitudRecibidaEvent evento) {
		log.info("Solicitud {} recibida: {}", evento.solicitud().referencia(), evento.solicitud().asunto());
	}
}
