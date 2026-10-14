package retotransversal.config;

import org.springframework.boot.web.servlet.MultipartConfigFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.unit.DataSize;

import jakarta.servlet.MultipartConfigElement;

/**
 * Subidas de archivos (las fotos de las sesiones, ver ImagenSesionService): hasta 5 MB por foto, con
 * algo de margen para el resto de la petición. Spring corta en 1 MB si no se dice nada.
 */
@Configuration
public class ImagenesConfig {

	@Bean
	MultipartConfigElement multipartConfigElement() {
		MultipartConfigFactory factory = new MultipartConfigFactory();
		factory.setMaxFileSize(DataSize.ofMegabytes(5));
		factory.setMaxRequestSize(DataSize.ofMegabytes(6));
		return factory.createMultipartConfig();
	}
}
