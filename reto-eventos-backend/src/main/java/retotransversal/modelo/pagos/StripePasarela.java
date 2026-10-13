package retotransversal.modelo.pagos;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stripe.StripeClient;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Event;
import com.stripe.model.checkout.Session;
import com.stripe.net.RequestOptions;
import com.stripe.param.RefundCreateParams;
import com.stripe.param.checkout.SessionCreateParams;
import com.stripe.param.checkout.SessionCreateParams.LineItem;
import com.stripe.param.checkout.SessionCreateParams.LineItem.PriceData;
import com.stripe.param.checkout.SessionCreateParams.LineItem.PriceData.ProductData;

import retotransversal.modelo.entities.EntregaPedido;
import retotransversal.modelo.entities.Pedido;

/**
 * Stripe Checkout. Los importes salen del pedido que ha calculado el servidor, en céntimos; Stripe
 * pinta la página de pago y devuelve al comprador a la tienda. Las operaciones que cobran o
 * devuelven llevan clave de idempotencia: si se repiten (un reintento, un doble clic), Stripe
 * contesta lo mismo sin hacerlo dos veces.
 */
public class StripePasarela implements PasarelaPago {

	/** Lo mínimo que admite Stripe; lo que tarda en volver al almacén un pedido que nadie paga. */
	static final Duration VIGENCIA = Duration.ofMinutes(30);

	private final StripeClient stripe;
	private final String secretoAvisos;
	private final String urlTienda;
	private final Clock reloj;
	private final ObjectMapper json = new ObjectMapper();

	public StripePasarela(StripeClient stripe, String secretoAvisos, String urlTienda, Clock reloj) {
		this.stripe = stripe;
		this.secretoAvisos = secretoAvisos;
		this.urlTienda = urlTienda.replaceAll("/+$", "");
		this.reloj = reloj;
	}

	@Override
	public SesionPago abrir(Pedido pedido, String correo) {
		Instant caduca = reloj.instant().plus(VIGENCIA);
		SessionCreateParams.Builder datos = SessionCreateParams.builder()
				.setMode(SessionCreateParams.Mode.PAYMENT)
				.setLocale(SessionCreateParams.Locale.ES)
				.setClientReferenceId(pedido.getReferencia())
				.putMetadata("referencia", pedido.getReferencia())
				.setExpiresAt(caduca.getEpochSecond())
				// La tienda sabe de qué pedido se vuelve por lo que guardó antes de salir (ver shop-page).
				.setSuccessUrl(urlTienda + "/tienda?pago=hecho#su-pedido")
				.setCancelUrl(urlTienda + "/tienda?pago=cancelado#su-pedido");
		if (correo != null && !correo.isBlank()) {
			datos.setCustomerEmail(correo);
		}
		pedido.getLineas().forEach(linea -> datos.addLineItem(
				linea(linea.getNombre(), linea.getPrecioUnitario(), linea.getCantidad())));
		if (pedido.getGastosEnvio().signum() > 0) {
			datos.addLineItem(linea(pedido.getEntrega() == EntregaPedido.ENVIO ? "Envío refrigerado" : "Entrega",
					pedido.getGastosEnvio(), 1));
		}
		try {
			Session sesion = stripe.v1().checkout().sessions().create(datos.build(),
					RequestOptions.builder().setIdempotencyKey("pedido-" + pedido.getReferencia()).build());
			return new SesionPago(sesion.getId(), sesion.getUrl(), caduca);
		} catch (StripeException e) {
			throw new PagoNoDisponibleException("No hemos podido abrir el pago. Inténtelo de nuevo en unos minutos.", e);
		}
	}

	@Override
	public EstadoSesionPago consultar(String sesion) {
		try {
			Session datos = stripe.v1().checkout().sessions().retrieve(sesion);
			EstadoSesionPago.Estado estado;
			if ("paid".equals(datos.getPaymentStatus()) || "no_payment_required".equals(datos.getPaymentStatus())) {
				estado = EstadoSesionPago.Estado.PAGADA;
			} else if ("expired".equals(datos.getStatus())) {
				estado = EstadoSesionPago.Estado.CADUCADA;
			} else {
				estado = EstadoSesionPago.Estado.ABIERTA;
			}
			return new EstadoSesionPago(estado, datos.getPaymentIntent());
		} catch (StripeException e) {
			throw new PagoNoDisponibleException("No hemos podido consultar el pago.", e);
		}
	}

	@Override
	public void caducar(String sesion) {
		try {
			stripe.v1().checkout().sessions().expire(sesion);
		} catch (StripeException e) {
			// Si ya no estaba abierta (pagada o caducada), quien llama lo sabrá al consultarla.
			throw new PagoNoDisponibleException("No hemos podido cerrar el pago.", e);
		}
	}

	@Override
	public String reembolsar(String pago) {
		try {
			return stripe.v1().refunds().create(RefundCreateParams.builder().setPaymentIntent(pago).build(),
					RequestOptions.builder().setIdempotencyKey("reembolso-" + pago).build()).getId();
		} catch (StripeException e) {
			throw new PagoNoDisponibleException("No hemos podido devolver el pago. Inténtelo de nuevo en unos minutos.", e);
		}
	}

	@Override
	public AvisoPago leerAviso(String cuerpo, String firma) {
		if (secretoAvisos == null || secretoAvisos.isBlank()) {
			throw new AvisoPagoNoValidoException("No hay secreto de avisos configurado", null);
		}
		try {
			// Comprueba la firma y que el aviso es reciente (5 minutos), para que no se pueda repetir uno viejo.
			Event aviso = stripe.constructEvent(cuerpo, firma, secretoAvisos);
			String sesion = null;
			if (aviso.getType().startsWith("checkout.session.")) {
				// Del objeto solo se lee el id: el estado se pregunta luego a Stripe. Así da igual la versión
				// de la API con la que se escribió el aviso.
				JsonNode objeto = json.readTree(aviso.getDataObjectDeserializer().getRawJson());
				sesion = objeto.path("id").asText(null);
			}
			return new AvisoPago(aviso.getType(), sesion);
		} catch (SignatureVerificationException e) {
			throw new AvisoPagoNoValidoException("Firma no válida", e);
		} catch (Exception e) {
			throw new AvisoPagoNoValidoException("Aviso ilegible", e);
		}
	}

	private static LineItem linea(String nombre, BigDecimal precio, int cantidad) {
		return LineItem.builder()
				.setQuantity((long) cantidad)
				.setPriceData(PriceData.builder()
						.setCurrency("eur")
						.setUnitAmount(precio.movePointRight(2).longValueExact())
						.setProductData(ProductData.builder().setName(nombre).build())
						.build())
				.build();
	}
}
