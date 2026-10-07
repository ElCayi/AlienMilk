package retotransversal.modelo.service;

import java.util.List;

import retotransversal.modelo.dto.SolicitudDto;
import retotransversal.modelo.dto.SolicitudPayloadDto;
import retotransversal.modelo.dto.SolicitudRecibidaDto;
import retotransversal.modelo.entities.EstadoSolicitud;
import retotransversal.modelo.formularios.FormularioDefinicion;

public interface SolicitudService {

	FormularioDefinicion definicion(String clave);

	/** @param origen dirección del visitante, para el límite de envíos */
	SolicitudRecibidaDto recibir(String clave, SolicitudPayloadDto payload, String origen);

	List<SolicitudDto> listar();

	SolicitudDto cambiarEstado(Integer idSolicitud, EstadoSolicitud estado);

	void borrar(Integer idSolicitud);
}
