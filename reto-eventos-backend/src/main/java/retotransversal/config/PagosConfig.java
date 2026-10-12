package retotransversal.config;

import java.time.Clock;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

import com.stripe.StripeClient;

import retotransversal.modelo.pagos.PasarelaPago;
import retotransversal.modelo.pagos.StripePasarela;

/**
 * La pasarela de pago solo existe si hay clave de Stripe; sin ella, TiendaServiceImpl confirma los
 * pedidos sin cobrar. La tarea programada repasa los pagos que se quedaron a medias (ver
 * TiendaServiceImpl.repasarPagosPendientes).
 */
@Configuration
@EnableScheduling
@EnableConfigurationProperties(StripeProperties.class)
public class PagosConfig {

	@Bean
	@ConditionalOnExpression("'${stripe.secret-key:}'.trim() != ''")
	PasarelaPago pasarelaPago(StripeProperties stripe,
			@Value("${tienda.url:http://127.0.0.1:4300}") String urlTienda) {
		return new StripePasarela(new StripeClient(stripe.secretKey()), stripe.webhookSecret(), urlTienda,
				Clock.systemUTC());
	}
}
