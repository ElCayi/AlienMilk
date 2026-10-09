package retotransversal.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.PropertySource;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * Los avisos se envían en segundo plano para que el formulario no espere al servidor de correo.
 * {@code avisos-correo.properties} trae lo que no es secreto (puerto, STARTTLS, tiempos de espera);
 * la cuenta y el destino llegan por variables de entorno, que tienen prioridad.
 */
@Configuration
@EnableAsync
@EnableConfigurationProperties(AvisosCorreoProperties.class)
@PropertySource("classpath:avisos-correo.properties")
public class AvisosCorreoConfig {
}
