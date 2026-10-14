package retotransversal.modelo.service;

import java.io.UnsupportedEncodingException;
import java.time.Duration;
import java.util.List;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
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

/**
 * Escribe al comprador cuando su pedido se recibe, se paga, sale, llega o se anula. Como el aviso de
 * solicitudes, va en segundo plano y después de confirmar la transacción: el pedido no espera al
 * correo ni falla por él. Sin servidor de correo (SPRING_MAIL_HOST) no se envía nada y cada correo
 * queda apuntado en el registro con su asunto, para ver qué se habría mandado. Las respuestas del
 * comprador van a la bandeja de avisos (AVISOS_CORREO_DESTINO), si la hay.
 */
@Slf4j
@Component
public class AvisoPedidos {

	private static final List<Duration> ESPERAS = List.of(Duration.ofSeconds(30), Duration.ofMinutes(2));

	private final ObjectProvider<JavaMailSender> correo;
	private final AvisosCorreoProperties propiedades;
	private final String devoluciones;
	private final List<Duration> esperas;

	@Autowired
	public AvisoPedidos(ObjectProvider<JavaMailSender> correo, AvisosCorreoProperties propiedades,
			@Value("${tienda.url:http://127.0.0.1:4300}") String urlTienda) {
		this(correo, propiedades, urlTienda, ESPERAS);
	}

	AvisoPedidos(ObjectProvider<JavaMailSender> correo, AvisosCorreoProperties propiedades, String urlTienda,
			List<Duration> esperas) {
		this.correo = correo;
		this.propiedades = propiedades;
		this.devoluciones = urlTienda.replaceAll("/+$", "") + "/tienda#devoluciones";
		this.esperas = esperas;
	}

	@EventListener(ApplicationReadyEvent.class)
	public void comprobarConfiguracion() {
		log.info(correo.getIfAvailable() != null ? "Correo a los compradores de la tienda: activo"
				: "Correo a los compradores de la tienda: sin servidor de correo, solo se apunta en el registro");
	}

	@Async
	@TransactionalEventListener
	public void alCambiar(PedidoAvisoEvent aviso) {
		String referencia = aviso.pedido().referencia();
		JavaMailSender servidor = correo.getIfAvailable();
		if (servidor == null) {
			// Sin la dirección del comprador: el registro no es sitio para datos personales.
			log.info("Correo del pedido {} sin enviar (no hay servidor de correo): «{}»", referencia,
					CorreoPedido.asunto(aviso));
			return;
		}
		if (aviso.correo() == null || aviso.correo().isBlank()) {
			log.warn("Correo del pedido {} sin enviar: el comprador no tiene dirección", referencia);
			return;
		}
		for (int intento = 0;; intento++) {
			try {
				servidor.send(mensaje(servidor, aviso));
				log.info("Correo del pedido {} enviado ({})", referencia, aviso.motivo());
				return;
			} catch (MailAuthenticationException ex) {
				log.error("Correo del pedido {} no enviado: el servidor rechaza la cuenta", referencia, ex);
				return;
			} catch (MailException | MessagingException | UnsupportedEncodingException ex) {
				if (intento >= esperas.size()) {
					log.error("Correo del pedido {} ({}) no enviado tras {} intentos", referencia, aviso.motivo(),
							intento + 1, ex);
					return;
				}
				log.warn("Correo del pedido {} no enviado ({}); se reintenta", referencia, ex.getMessage());
				if (!esperar(esperas.get(intento))) {
					return;
				}
			}
		}
	}

	MimeMessage mensaje(JavaMailSender servidor, PedidoAvisoEvent aviso)
			throws MessagingException, UnsupportedEncodingException {
		MimeMessage mensaje = servidor.createMimeMessage();
		MimeMessageHelper ayuda = new MimeMessageHelper(mensaje, true, "UTF-8");
		ayuda.setTo(new InternetAddress(aviso.correo(), aviso.nombre(), "UTF-8"));
		if (tiene(propiedades.remitente())) {
			ayuda.setFrom(new InternetAddress(propiedades.remitente(), "AlienMilk Distribución", "UTF-8"));
		}
		if (tiene(propiedades.destino())) {
			ayuda.setReplyTo(propiedades.destino());
		}
		ayuda.setSubject(CorreoPedido.asunto(aviso));
		ayuda.setText(CorreoPedido.texto(aviso, devoluciones), CorreoPedido.html(aviso, devoluciones));
		return mensaje;
	}

	private static boolean tiene(String valor) {
		return valor != null && !valor.isBlank();
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
