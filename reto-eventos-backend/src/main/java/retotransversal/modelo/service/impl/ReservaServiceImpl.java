package retotransversal.modelo.service.impl;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import retotransversal.exception.ConflictoNegocioException;
import retotransversal.exception.OperacionNoPermitidaException;
import retotransversal.exception.RecursoNoEncontradoException;
import retotransversal.modelo.entities.EstadoEvento;
import retotransversal.modelo.entities.Evento;
import retotransversal.modelo.entities.Reserva;
import retotransversal.modelo.entities.Usuario;
import retotransversal.modelo.repository.ReservaRepository;
import retotransversal.modelo.service.EventoService;
import retotransversal.modelo.service.ReservaService;
import retotransversal.modelo.service.UsuarioService;

@Service
@RequiredArgsConstructor
public class ReservaServiceImpl implements ReservaService {

	private final ReservaRepository reservaRepository;
	private final EventoService eventoService;
	private final UsuarioService usuarioService;

	@Override
	public Reserva findById(Integer id) {
		return reservaRepository.findById(id)
				.orElseThrow(() -> new RecursoNoEncontradoException("Reserva no encontrada"));
	}

	@Override
	public List<Reserva> findAll() {
		return reservaRepository.findAll();
	}

	@Override
	public Reserva insertOne(Reserva entidad) {
		return reservaRepository.save(entidad);
	}

	@Override
	public Reserva updateOne(Reserva entidad) {
		findById(entidad.getIdReserva());
		return reservaRepository.save(entidad);
	}

	@Override
	public int deleteOne(Integer id) {
		findById(id);
		reservaRepository.deleteById(id);
		return 1;
	}

	@Override
	public List<Reserva> findByUsuario(String username) {
		return reservaRepository.findByUsuarioUsername(username);
	}

	@Override
	public List<Reserva> findTodas() {
		return reservaRepository.findAll(Sort.by(Sort.Order.desc("evento.fechaInicio"), Sort.Order.desc("idReserva")));
	}

	@Override
	public Reserva reservarEvento(Integer idEvento, String username, Integer cantidad, String observaciones) {
		Evento evento = eventoService.findById(idEvento);
		Usuario usuario = usuarioService.findById(username);
		validarReserva(evento, username, cantidad);
		if (observaciones != null && observaciones.strip().length() > 200) {
			throw new ConflictoNegocioException("Las observaciones no pueden superar 200 caracteres");
		}

		Reserva reserva = Reserva.builder()
				.evento(evento)
				.usuario(usuario)
				.cantidad(cantidad)
				.observaciones(observaciones == null || observaciones.isBlank() ? null : observaciones.strip())
				.precioVenta(evento.getPrecio().multiply(BigDecimal.valueOf(cantidad.longValue())))
				.build();

		return reservaRepository.save(reserva);
	}

	@Override
	public int cancelarReserva(Integer idReserva, String username) {
		Reserva reserva = findById(idReserva);
		if (!reserva.getUsuario().getUsername().equals(username)) {
			throw new OperacionNoPermitidaException("Solo puedes cancelar tus propias reservas");
		}
		// Una reserva de una sesión cancelada o ya celebrada es historial: se queda en la lista.
		if (reserva.getEvento().getEstado() != EstadoEvento.ACTIVO) {
			throw new ConflictoNegocioException("La sesión ya no está activa: la reserva se queda en tu historial");
		}
		if (!eventoService.admiteCancelaciones(reserva.getEvento())) {
			throw new ConflictoNegocioException("Las reservas se pueden cancelar hasta el día anterior a la sesión");
		}
		reservaRepository.deleteById(idReserva);
		return 1;
	}

	@Override
	public int cancelarReservaAdmin(Integer idReserva) {
		findById(idReserva);
		reservaRepository.deleteById(idReserva);
		return 1;
	}

	private void validarReserva(Evento evento, String username, Integer cantidad) {
		if (cantidad == null || cantidad < 1) {
			throw new ConflictoNegocioException("Reserva al menos una plaza");
		}
		if (cantidad > 10) {
			throw new ConflictoNegocioException("Como máximo 10 plazas por reserva");
		}
		if (evento.getEstado() != EstadoEvento.ACTIVO) {
			throw new ConflictoNegocioException("Esta sesión ya no admite reservas");
		}
		// Sigue activa hasta que acaba, pero las reservas cierran con el control de ingreso.
		if (!eventoService.admiteReservas(evento)) {
			throw new ConflictoNegocioException("Las reservas de esta sesión ya están cerradas: cierran 10 minutos antes de empezar");
		}

		int aforoReservado = reservaRepository.findByEventoIdEvento(evento.getIdEvento())
				.stream()
				.mapToInt(Reserva::getCantidad)
				.sum();

		if (aforoReservado + cantidad > evento.getAforoMaximo()) {
			throw new ConflictoNegocioException("No quedan plazas suficientes en esta sesión");
		}

		int entradasUsuario = reservaRepository.findByUsuarioUsernameAndEventoIdEvento(username, evento.getIdEvento())
				.stream()
				.mapToInt(Reserva::getCantidad)
				.sum();

		if (entradasUsuario + cantidad > 10) {
			throw new ConflictoNegocioException("Como máximo 10 plazas por persona en la misma sesión");
		}
	}
}
