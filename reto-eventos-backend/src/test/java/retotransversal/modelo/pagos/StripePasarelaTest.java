package retotransversal.modelo.pagos;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;

import com.stripe.StripeClient;
import com.stripe.net.Webhook;

/** La firma de los avisos, con la verificación real de la librería de Stripe y sin red. */
class StripePasarelaTest {

	private static final String SECRETO = "whsec_prueba";
	private static final String AVISO = """
			{"id": "evt_1", "object": "event", "type": "checkout.session.completed",
			 "data": {"object": {"id": "cs_test_42", "object": "checkout.session", "payment_status": "paid"}}}
			""";

	private final StripePasarela pasarela = new StripePasarela(new StripeClient("sk_test_sin_red"), SECRETO,
			"http://127.0.0.1:4300/", Clock.fixed(Instant.now(), ZoneOffset.UTC));

	@Test
	void aSignedNoticeSaysWhichSessionItIsAbout() throws Exception {
		AvisoPago aviso = pasarela.leerAviso(AVISO, firmar(AVISO, SECRETO));

		assertThat(aviso.tipo()).isEqualTo("checkout.session.completed");
		assertThat(aviso.sesion()).isEqualTo("cs_test_42");
	}

	@Test
	void aNoticeSignedWithAnotherSecretOrTamperedWithIsRejected() throws Exception {
		assertThatThrownBy(() -> pasarela.leerAviso(AVISO, firmar(AVISO, "whsec_de_otro")))
				.isInstanceOf(AvisoPagoNoValidoException.class);
		assertThatThrownBy(() -> pasarela.leerAviso(AVISO.replace("cs_test_42", "cs_test_99"), firmar(AVISO, SECRETO)))
				.isInstanceOf(AvisoPagoNoValidoException.class);
		assertThatThrownBy(() -> pasarela.leerAviso(AVISO, null)).isInstanceOf(AvisoPagoNoValidoException.class);
	}

	@Test
	void withoutASecretNoNoticeIsBelieved() throws Exception {
		StripePasarela sinSecreto = new StripePasarela(new StripeClient("sk_test_sin_red"), "", "http://x",
				Clock.systemUTC());

		assertThatThrownBy(() -> sinSecreto.leerAviso(AVISO, firmar(AVISO, SECRETO)))
				.isInstanceOf(AvisoPagoNoValidoException.class);
	}

	/** Lo que hace Stripe al enviar un aviso: HMAC-SHA256 de «marca de tiempo.cuerpo». */
	private static String firmar(String cuerpo, String secreto) throws Exception {
		long t = Instant.now().getEpochSecond();
		return "t=" + t + ",v1=" + Webhook.Util.computeHmacSha256(secreto, t + "." + cuerpo);
	}
}
