package retotransversal.modelo.formularios;

/**
 * Un dato de una solicitud tal como se guarda: con la etiqueta que tenía el campo al enviarla, para
 * que el panel de admin la siga mostrando bien aunque el formulario cambie después.
 */
public record DatoSolicitud(String clave, String etiqueta, String valor) {
}
