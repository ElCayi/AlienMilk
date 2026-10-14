package retotransversal.modelo.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Properties;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.javamail.JavaMailSender;

import jakarta.mail.Session;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import retotransversal.config.AvisosCorreoProperties;
import retotransversal.modelo.dto.LineaPedidoDto;
import retotransversal.modelo.dto.PedidoDto;
import retotransversal.modelo.entities.EntregaPedido;
import retotransversal.modelo.entities.EstadoPedido;
import retotransversal.modelo.service.PedidoAvisoEvent.Motivo;

class AvisoPedidosTest {

	private static final AvisosCorreoProperties PROPIEDADES = new AvisosCorreoProperties("bandeja@example.com",
			"tienda@example.com", null);
	private static final String DEVOLUCIONES = "https://alienmilk.example/tienda#devoluciones";

	private JavaMailSender servidor;

	@BeforeEach
	void prepararServidor() {
		servidor = mock(JavaMailSender.class);
		when(servidor.createMimeMessage()).thenAnswer(i -> new MimeMessage(Session.getInstance(new Properties())));
	}

	@Test
	void writesToTheBuyerAndRepliesGoToTheShop() throws Exception {
		aviso(servidor).alCambiar(evento(Motivo.ENVIADO, pedido(EstadoPedido.ENVIADO, false), null));

		ArgumentCaptor<MimeMessage> enviado = ArgumentCaptor.forClass(MimeMessage.class);
		verify(servidor).send(enviado.capture());
		MimeMessage mensaje = enviado.getValue();
		mensaje.saveChanges();
		assertThat(mensaje.getSubject()).isEqualTo("AMD-2026-0042 · Su pedido está en camino");
		assertThat(((InternetAddress) mensaje.getAllRecipients()[0]).getAddress()).isEqualTo("dallas@example.com");
		assertThat(((InternetAddress) mensaje.getFrom()[0]).getPersonal()).isEqualTo("AlienMilk Distribución");
		assertThat(((InternetAddress) mensaje.getReplyTo()[0]).getAddress()).isEqualTo("bandeja@example.com");
	}

	@Test
	void withoutAMailServerItOnlyLogs() {
		@SuppressWarnings("unchecked")
		ObjectProvider<JavaMailSender> sinServidor = mock(ObjectProvider.class);
		new AvisoPedidos(sinServidor, PROPIEDADES, "https://alienmilk.example", List.of())
				.alCambiar(evento(Motivo.RECIBIDO, pedido(EstadoPedido.CONFIRMADO, true), null));

		verify(servidor, never()).send(any(MimeMessage.class));
	}

	@Test
	void theFirstMessageToAGuestCarriesThePrivateLinkAndThePaymentPage() {
		PedidoAvisoEvent aviso = evento(Motivo.RECIBIDO, pedido(EstadoPedido.PENDIENTE_PAGO, true),
				"https://alienmilk.example/tienda/pedido/AMD-2026-0042#clave");

		String texto = CorreoPedido.texto(aviso, DEVOLUCIONES);
		assertThat(CorreoPedido.asunto(aviso)).isEqualTo("AMD-2026-0042 · Pedido reservado, pendiente de pago");
		assertThat(texto).contains("hasta las 10:30")
				.contains("Pagar el pedido: https://checkout.example/pagar")
				.contains("Ver el pedido: https://alienmilk.example/tienda/pedido/AMD-2026-0042#clave")
				.contains("Guarde este correo")
				.contains("2 × Copa de degustación: 36,00 €")
				.contains("Total: 36,00 €");
	}

	@Test
	void whatTheBuyerWroteIsEscaped() {
		PedidoAvisoEvent aviso = new PedidoAvisoEvent(Motivo.ENVIADO, pedido(EstadoPedido.ENVIADO, true),
				"dallas@example.com", "Dallas <b>", null, false);

		String html = CorreoPedido.html(aviso, DEVOLUCIONES);
		assertThat(html).contains("Hola, Dallas &lt;b&gt;:").doesNotContain("<b>")
				.contains("Muelle 3 &lt;script&gt;").doesNotContain("<script>");
	}

	@Test
	void aRefundIsMentionedOnlyWhenThereWasOne() {
		PedidoDto anulado = pedido(EstadoPedido.ANULADO, false);
		assertThat(CorreoPedido.mensaje(new PedidoAvisoEvent(Motivo.ANULADO, anulado, "d@example.com", "Dallas",
				null, true))).contains("Le hemos devuelto 36,00 €");
		assertThat(CorreoPedido.mensaje(new PedidoAvisoEvent(Motivo.ANULADO, anulado, "d@example.com", "Dallas",
				null, false))).doesNotContain("devuelto");
	}

	private AvisoPedidos aviso(JavaMailSender conServidor) {
		@SuppressWarnings("unchecked")
		ObjectProvider<JavaMailSender> correo = mock(ObjectProvider.class);
		when(correo.getIfAvailable()).thenReturn(conServidor);
		return new AvisoPedidos(correo, PROPIEDADES, "https://alienmilk.example", List.of(Duration.ZERO));
	}

	private static PedidoAvisoEvent evento(Motivo motivo, PedidoDto pedido, String enlace) {
		return new PedidoAvisoEvent(motivo, pedido, "dallas@example.com", "Dallas", enlace, false);
	}

	private static PedidoDto pedido(EstadoPedido estado, boolean invitado) {
		boolean pendiente = estado == EstadoPedido.PENDIENTE_PAGO;
		return new PedidoDto(42, "AMD-2026-0042", estado, EntregaPedido.ENVIO, "Muelle 3 <script>",
				new BigDecimal("36.00"), BigDecimal.ZERO, new BigDecimal("36.00"), LocalDateTime.of(2026, 10, 14, 10, 0),
				null, estado == EstadoPedido.ENVIADO ? LocalDateTime.of(2026, 10, 15, 9, 0) : null, null,
				List.of(new LineaPedidoDto("copa-de-degustacion", "Copa de degustación", new BigDecimal("18.00"), 2,
						new BigDecimal("36.00"))),
				invitado, invitado ? "Dallas" : null, pendiente ? "https://checkout.example/pagar" : null,
				pendiente ? LocalDateTime.of(2026, 10, 14, 10, 30) : null, null);
	}
}
