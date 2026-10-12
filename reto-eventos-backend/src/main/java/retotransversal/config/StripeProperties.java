package retotransversal.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Cobro de la tienda con Stripe Checkout. Sin clave secreta el pago queda apagado y la tienda
 * funciona como demostración: los pedidos se confirman sin cobrar.
 *
 * @param secretKey     {@code STRIPE_SECRET_KEY}; en desarrollo, la del entorno de prueba (sk_test_…)
 * @param webhookSecret {@code STRIPE_WEBHOOK_SECRET}: firma de los avisos (whsec_…). Sin ella los
 *                      avisos se rechazan y los pedidos se ponen al día al consultarlos.
 */
@ConfigurationProperties("stripe")
public record StripeProperties(String secretKey, String webhookSecret) {

	public boolean activo() {
		return secretKey != null && !secretKey.isBlank();
	}
}
