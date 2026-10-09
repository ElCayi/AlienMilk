package retotransversal.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Aviso por correo de cada solicitud nueva. Sin {@code destino} (o sin servidor de correo) el aviso
 * queda apagado y las solicitudes solo se ven en el panel de admin.
 *
 * @param destino   a quién se avisa ({@code AVISOS_CORREO_DESTINO})
 * @param remitente desde qué dirección; por defecto, la cuenta SMTP ({@code spring.mail.username})
 * @param panel     enlace a la bandeja del admin que se añade al correo, opcional
 */
@ConfigurationProperties("avisos.correo")
public record AvisosCorreoProperties(String destino, String remitente, String panel) {

	public boolean activo() {
		return destino != null && !destino.isBlank();
	}
}
