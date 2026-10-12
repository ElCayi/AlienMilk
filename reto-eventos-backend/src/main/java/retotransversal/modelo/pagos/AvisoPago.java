package retotransversal.modelo.pagos;

/** Un aviso de la pasarela ya verificado: qué ha pasado y en qué sesión (null si no es de una). */
public record AvisoPago(String tipo, String sesion) {
}
