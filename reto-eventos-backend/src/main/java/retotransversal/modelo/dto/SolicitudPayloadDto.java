package retotransversal.modelo.dto;

import java.util.Map;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Lo que envía un formulario público. */
@AllArgsConstructor
@NoArgsConstructor
@Data
public class SolicitudPayloadDto {

	/** Valores de los campos, por su clave en la definición del formulario. */
	private Map<String, Object> valores;

	private Boolean aceptaPrivacidad;

	/**
	 * Campo trampa: el formulario lo oculta a las personas, así que solo lo rellenan los programas que
	 * envían formularios automáticamente.
	 */
	private String web;
}
