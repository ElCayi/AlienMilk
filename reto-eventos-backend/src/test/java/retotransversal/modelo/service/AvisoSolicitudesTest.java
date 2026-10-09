package retotransversal.modelo.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Properties;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.mail.MailSenderAutoConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.mail.MailAuthenticationException;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.boot.autoconfigure.AutoConfigurations;

import jakarta.mail.Session;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import retotransversal.config.AvisosCorreoConfig;
import retotransversal.config.AvisosCorreoProperties;
import retotransversal.modelo.dto.SolicitudDto;
import retotransversal.modelo.entities.EstadoSolicitud;
import retotransversal.modelo.formularios.DatoSolicitud;

class AvisoSolicitudesTest {

	private static final AvisosCorreoProperties ACTIVO = new AvisosCorreoProperties("bandeja@example.com",
			"avisos@example.com", "https://alienmilk.example/admin");

	private final SolicitudDto solicitud = new SolicitudDto(42, "AMT-2026-0042", "operador-am-transit",
			"AM Transit · Solicitud de traslado", "Ripley <script>", "ripley@example.com",
			List.of(new DatoSolicitud("nombre", "Nombre", "Ripley <script>"),
					new DatoSolicitud("email", "Correo electrónico", "ripley@example.com"),
					new DatoSolicitud("fecha", "Fecha", "2026-11-14"),
					new DatoSolicitud("mensaje", "Mensaje", "Primera línea\nSegunda línea")),
			EstadoSolicitud.NUEVA, LocalDateTime.of(2026, 10, 8, 10, 42), null);

	private JavaMailSender servidor;

	@BeforeEach
	void prepararServidor() {
		servidor = mock(JavaMailSender.class);
		when(servidor.createMimeMessage()).thenAnswer(i -> new MimeMessage(Session.getInstance(new Properties())));
	}

	@Test
	void sendsOneMessageThatRepliesToTheVisitor() throws Exception {
		aviso(ACTIVO).alRecibir(new SolicitudRecibidaEvent(solicitud));

		ArgumentCaptor<MimeMessage> enviado = ArgumentCaptor.forClass(MimeMessage.class);
		verify(servidor).send(enviado.capture());
		MimeMessage mensaje = enviado.getValue();
		mensaje.saveChanges();
		assertThat(mensaje.getSubject()).isEqualTo("AMT-2026-0042 · AM Transit · Solicitud de traslado");
		assertThat(mensaje.getAllRecipients()).extracting(Object::toString).containsExactly("bandeja@example.com");
		InternetAddress remitente = (InternetAddress) mensaje.getFrom()[0];
		assertThat(remitente.getAddress()).isEqualTo("avisos@example.com");
		assertThat(remitente.getPersonal()).isEqualTo("AlienMilk Sessions");
		InternetAddress respuesta = (InternetAddress) mensaje.getReplyTo()[0];
		assertThat(respuesta.getAddress()).isEqualTo("ripley@example.com");
		assertThat(respuesta.getPersonal()).isEqualTo("Ripley <script>");
	}

	@Test
	void retriesATransientFailureAndThenGivesUp() {
		doThrow(new MailSendException("timeout")).when(servidor).send(any(MimeMessage.class));

		aviso(ACTIVO).alRecibir(new SolicitudRecibidaEvent(solicitud));

		verify(servidor, times(3)).send(any(MimeMessage.class));
	}

	@Test
	void doesNotRetryRejectedCredentials() {
		doThrow(new MailAuthenticationException("535")).when(servidor).send(any(MimeMessage.class));

		aviso(ACTIVO).alRecibir(new SolicitudRecibidaEvent(solicitud));

		verify(servidor, times(1)).send(any(MimeMessage.class));
	}

	@Test
	void staysQuietWithoutADestination() {
		aviso(new AvisosCorreoProperties(null, "avisos@example.com", null))
				.alRecibir(new SolicitudRecibidaEvent(solicitud));

		verify(servidor, never()).send(any(MimeMessage.class));
	}

	@Test
	void theMessageEscapesWhatTheVisitorWrote() {
		String html = CorreoSolicitud.html(solicitud, ACTIVO.panel());
		String texto = CorreoSolicitud.texto(solicitud, ACTIVO.panel());

		assertThat(html).doesNotContain("<script>").contains("Ripley &lt;script&gt;")
				.contains("8 de octubre de 2026, a las 10:42").contains("href=\"https://alienmilk.example/admin\"");
		assertThat(texto).contains("AMT-2026-0042").contains("Fecha: 14 de noviembre de 2026").contains("Mensaje: Primera línea\nSegunda línea")
				.contains("Bandeja de solicitudes: https://alienmilk.example/admin");
		assertThat(CorreoSolicitud.html(solicitud, null)).doesNotContain("Abrir la bandeja");
	}

	@Test
	void environmentConfigurationTurnsItOnWithSafeDefaults() {
		new ApplicationContextRunner()
				.withConfiguration(AutoConfigurations.of(MailSenderAutoConfiguration.class))
				.withUserConfiguration(AvisosCorreoConfig.class)
				.withPropertyValues("spring.mail.host=smtp.example.com", "spring.mail.username=avisos@example.com",
						"avisos.correo.destino=bandeja@example.com")
				.run(context -> {
					assertThat(context).hasSingleBean(JavaMailSender.class);
					JavaMailSenderImpl impl = (JavaMailSenderImpl) context.getBean(JavaMailSender.class);
					assertThat(impl.getPort()).isEqualTo(587);
					assertThat(impl.getJavaMailProperties()).containsEntry("mail.smtp.starttls.required", "true")
							.containsEntry("mail.smtp.timeout", "10000");
					AvisosCorreoProperties propiedades = context.getBean(AvisosCorreoProperties.class);
					assertThat(propiedades.activo()).isTrue();
					assertThat(propiedades.remitente()).isEqualTo("avisos@example.com");
				});
	}

	@Test
	void withoutConfigurationThereIsNoMailServer() {
		new ApplicationContextRunner()
				.withConfiguration(AutoConfigurations.of(MailSenderAutoConfiguration.class))
				.withUserConfiguration(AvisosCorreoConfig.class)
				.run(context -> {
					assertThat(context).doesNotHaveBean(JavaMailSender.class);
					assertThat(context.getBean(AvisosCorreoProperties.class).activo()).isFalse();
				});
	}

	private AvisoSolicitudes aviso(AvisosCorreoProperties propiedades) {
		@SuppressWarnings("unchecked")
		ObjectProvider<JavaMailSender> proveedor = mock(ObjectProvider.class);
		when(proveedor.getIfAvailable()).thenReturn(servidor);
		return new AvisoSolicitudes(proveedor, propiedades, List.of(Duration.ZERO, Duration.ZERO));
	}
}
