package retotransversal.modelo.service;

import retotransversal.modelo.dto.SolicitudDto;

/**
 * Se publica al guardar una solicitud. Quien quiera enterarse (un registro, un aviso por correo) la
 * escucha sin que el formulario espere por él.
 */
public record SolicitudRecibidaEvent(SolicitudDto solicitud) {
}
