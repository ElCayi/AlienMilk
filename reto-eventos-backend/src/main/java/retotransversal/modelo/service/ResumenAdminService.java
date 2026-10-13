package retotransversal.modelo.service;

import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import retotransversal.modelo.dto.ResumenAdminDto;
import retotransversal.modelo.entities.EstadoEvento;
import retotransversal.modelo.entities.EstadoPedido;
import retotransversal.modelo.entities.EstadoSolicitud;
import retotransversal.modelo.repository.EventoRepository;
import retotransversal.modelo.repository.PedidoRepository;
import retotransversal.modelo.repository.ReservaRepository;
import retotransversal.modelo.repository.SolicitudRepository;

/** Resumen del panel de administración: cuatro recuentos, sin cargar las listas. */
@Service
@RequiredArgsConstructor
public class ResumenAdminService {

	private final EventoRepository eventoRepository;
	private final ReservaRepository reservaRepository;
	private final PedidoRepository pedidoRepository;
	private final SolicitudRepository solicitudRepository;

	public ResumenAdminDto resumen() {
		return new ResumenAdminDto(
				eventoRepository.countByEstado(EstadoEvento.ACTIVO),
				reservaRepository.plazasReservadasEn(EstadoEvento.ACTIVO),
				pedidoRepository.countByEstado(EstadoPedido.CONFIRMADO),
				solicitudRepository.countByEstado(EstadoSolicitud.NUEVA));
	}
}
