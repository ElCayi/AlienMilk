package retotransversal.modelo.service;

import java.io.UnsupportedEncodingException;
import java.time.Duration;
import java.util.List;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.mail.MailAuthenticationException;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import retotransversal.config.AvisosCorreoProperties;
import retotransversal.modelo.dto.SolicitudDto;

/**
 * Avisa por correo de cada solicitud guardada. Va en segundo plano y después de confirmar la
 * transacción: el visitante recibe su resguardo aunque el correo tarde o falle, y la solicitud sigue
 * en el panel de admin pase lo que pase aquí. El correo responde al visitante (Reply-To).
 */
@Slf4j
@Component
public class AvisoSolicitudes {

	/** Esperas entre intentos: un fallo pasajero del servidor no debería perder el aviso. */
	private static final List<Duration> ESPERAS = List.of(Duration.ofSeconds(30), Duration.ofMinutes(2));

	private final ObjectProvider<JavaMailSender> correo;
	private final AvisosCorreoProperties propiedades;
	private final List<Duration> esperas;

	@Autowired
	public AvisoSolicitudes(ObjectProvider<JavaMailSender> correo, AvisosCorreoProperties propiedades) {
		this(correo, propiedades, ESPERAS);
	}

	AvisoSolicitudes(ObjectProvider<JavaMailSender> correo, AvisosCorreoProperties propiedades,
			List<Duration> esperas) {
		this.correo = correo;
		this.propiedades = propiedades;
		this.esperas = esperas;
	}

	/** Deja dicho al arrancar si el aviso está encendido, y por qué no si falta algo. */
	@EventListener(ApplicationReadyEvent.class)
	public void comprobarConfiguracion() {
		boolean hayServidor = correo.getIfAvailable() != null;
		if (propiedades.activo() && hayServidor) {
			log.info("Aviso de solicitudes por correo: activo");
		} else if (propiedades.activo()) {
			log.warn("Aviso de solicitudes por correo: falta el servidor (SPRING_MAIL_HOST); queda apagado");
		} else if (hayServidor) {
			log.warn("Aviso de solicitudes por correo: falta el destino (AVISOS_CORREO_DESTINO); queda apagado");
		} else {
			log.info("Aviso de solicitudes por correo: apagado (sin configurar)");
		}
	}

	@Async
	@TransactionalEventListener
	public void alRecibir(SolicitudRecibidaEvent evento) {
		JavaMailSender servidor = correo.getIfAvailable();
		if (!propiedades.activo() || servidor == null) {
			return;
		}
		SolicitudDto solicitud = evento.solicitud();
		for (int intento = 0;; intento++) {
			try {
				servidor.send(mensaje(servidor, solicitud));
				log.info("Aviso de la solicitud {} enviado", solicitud.referencia());
				return;
			} catch (MailAuthenticationException ex) {
				// Credenciales mal puestas: reintentar no lo arregla.
				log.error("Aviso de la solicitud {} no enviado: el servidor rechaza la cuenta", solicitud.referencia(),
						ex);
				return;
			} catch (MailException | MessagingException | UnsupportedEncodingException ex) {
				if (intento >= esperas.size()) {
					log.error("Aviso de la solicitud {} no enviado tras {} intentos; sigue en el panel de admin",
							solicitud.referencia(), intento + 1, ex);
					return;
				}
				log.warn("Aviso de la solicitud {} no enviado ({}); se reintenta", solicitud.referencia(),
						ex.getMessage());
				if (!esperar(esperas.get(intento))) {
					return;
				}
			}
		}
	}

	MimeMessage mensaje(JavaMailSender servidor, SolicitudDto solicitud)
			throws MessagingException, UnsupportedEncodingException {
		MimeMessage mensaje = servidor.createMimeMessage();
		MimeMessageHelper ayuda = new MimeMessageHelper(mensaje, true, "UTF-8");
		ayuda.setTo(propiedades.destino());
		if (propiedades.remitente() != null && !propiedades.remitente().isBlank()) {
			ayuda.setFrom(new InternetAddress(propiedades.remitente(), "AlienMilk Sessions", "UTF-8"));
		}
		ayuda.setReplyTo(new InternetAddress(solicitud.email(), solicitud.nombre(), "UTF-8"));
		ayuda.setSubject(CorreoSolicitud.asunto(solicitud));
		ayuda.setText(CorreoSolicitud.texto(solicitud, propiedades.panel()),
				CorreoSolicitud.html(solicitud, propiedades.panel()));
		return mensaje;
	}

	private static boolean esperar(Duration espera) {
		try {
			Thread.sleep(espera);
			return true;
		} catch (InterruptedException ex) {
			Thread.currentThread().interrupt();
			return false;
		}
	}
}
