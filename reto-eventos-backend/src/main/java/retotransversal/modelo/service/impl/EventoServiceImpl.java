package retotransversal.modelo.service.impl;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import retotransversal.exception.ConflictoNegocioException;
import retotransversal.exception.RecursoNoEncontradoException;
import retotransversal.modelo.dto.EventoAdminDto;
import retotransversal.modelo.entities.EstadoEvento;
import retotransversal.modelo.entities.Evento;
import retotransversal.modelo.entities.Reserva;
import retotransversal.modelo.repository.EventoRepository;
import retotransversal.modelo.repository.ReservaRepository;
import retotransversal.modelo.repository.ReservaRepository.OcupacionEvento;
import retotransversal.modelo.service.ErroresCampos;
import retotransversal.modelo.service.EventoService;

@Service
@RequiredArgsConstructor
public class EventoServiceImpl implements EventoService {

	/** El precio se guarda con DECIMAL(9, 2). */
	private static final BigDecimal PRECIO_MAXIMO = new BigDecimal("9999999.99");

	private final EventoRepository eventoRepository;
	private final ReservaRepository reservaRepository;

	@Override
	public Evento findById(Integer id) {
		return eventoRepository.findById(id)
				.orElseThrow(() -> new RecursoNoEncontradoException("Evento no encontrado"));
	}

	@Override
	public List<Evento> findAll() {
		return eventoRepository.findAll();
	}

	/** Una sesión nueva siempre empieza activa. */
	@Override
	public Evento insertOne(Evento entidad) {
		limpiar(entidad);
		validar(entidad, 0);
		entidad.setEstado(EstadoEvento.ACTIVO);
		return eventoRepository.save(entidad);
	}

	/**
	 * Editar no cambia el estado: una sesión cancelada sigue cancelada hasta que se reactive. El aforo
	 * no puede quedar por debajo de las plazas ya reservadas.
	 */
	@Override
	public Evento updateOne(Evento entidad) {
		Evento actual = findById(entidad.getIdEvento());
		limpiar(entidad);
		validar(entidad, plazasReservadas(actual.getIdEvento()));
		entidad.setEstado(actual.getEstado());
		return eventoRepository.save(entidad);
	}

	/** Solo se borra una sesión sin reservas; con reservas, se cancela y quedan en el historial. */
	@Override
	@Transactional
	public int deleteOne(Integer id) {
		findById(id);
		int reservas = reservaRepository.findByEventoIdEvento(id).size();
		if (reservas > 0) {
			throw new ConflictoNegocioException(reservas == 1
					? "Tiene una reserva: cancela la sesión en lugar de borrarla"
					: "Tiene %d reservas: cancela la sesión en lugar de borrarla".formatted(reservas));
		}
		eventoRepository.deleteById(id);
		return 1;
	}

	@Override
	public List<Evento> findActivos() {
		return eventoRepository.findByEstado(EstadoEvento.ACTIVO);
	}

	@Override
	public List<Evento> findCancelados() {
		return eventoRepository.findByEstado(EstadoEvento.CANCELADO);
	}

	@Override
	public List<Evento> findTerminados() {
		return eventoRepository.findByEstado(EstadoEvento.TERMINADO);
	}

	@Override
	public List<Evento> findActivosPorTipo(Integer idTipo) {
		return eventoRepository.findByTipoEventoIdTipoAndEstado(idTipo, EstadoEvento.ACTIVO);
	}

	@Override
	public Evento cancelarEvento(Integer idEvento) {
		Evento evento = findById(idEvento);
		if (evento.getEstado() != EstadoEvento.ACTIVO) {
			throw new ConflictoNegocioException("Solo se puede cancelar una sesión activa");
		}
		evento.setEstado(EstadoEvento.CANCELADO);
		return eventoRepository.save(evento);
	}

	@Override
	public Evento reactivarEvento(Integer idEvento) {
		Evento evento = findById(idEvento);
		if (evento.getEstado() != EstadoEvento.CANCELADO) {
			throw new ConflictoNegocioException("Solo se puede reactivar una sesión cancelada");
		}
		evento.setEstado(EstadoEvento.ACTIVO);
		return eventoRepository.save(evento);
	}

	@Override
	public List<EventoAdminDto> listadoAdmin() {
		Map<Integer, OcupacionEvento> ocupacion = reservaRepository.ocupacionPorEvento().stream()
				.collect(Collectors.toMap(OcupacionEvento::getIdEvento, Function.identity()));
		return eventoRepository.findAll().stream()
				.sorted(Comparator.comparing(Evento::getFechaInicio).thenComparing(Evento::getIdEvento))
				.map(evento -> {
					OcupacionEvento datos = ocupacion.get(evento.getIdEvento());
					return datos == null
							? EventoAdminDto.de(evento, 0, 0)
							: EventoAdminDto.de(evento, datos.getPlazas(), datos.getReservas());
				})
				.toList();
	}

	@Override
	public EventoAdminDto aAdminDto(Evento evento) {
		List<Reserva> reservas = reservaRepository.findByEventoIdEvento(evento.getIdEvento());
		return EventoAdminDto.de(evento, reservas.stream().mapToLong(Reserva::getCantidad).sum(), reservas.size());
	}

	private int plazasReservadas(Integer idEvento) {
		return reservaRepository.findByEventoIdEvento(idEvento).stream().mapToInt(Reserva::getCantidad).sum();
	}

	private static void limpiar(Evento evento) {
		evento.setNombre(ErroresCampos.limpio(evento.getNombre()));
		evento.setDescripcion(ErroresCampos.limpio(evento.getDescripcion()));
		evento.setDireccion(ErroresCampos.limpio(evento.getDireccion()));
	}

	private static void validar(Evento evento, int plazasReservadas) {
		ErroresCampos errores = new ErroresCampos()
				.obligatorio("nombre", evento.getNombre(), 50, "Escribe el nombre de la sesión")
				.maximo("descripcion", evento.getDescripcion(), 200)
				.si(evento.getFechaInicio() == null, "fechaInicio", "Indica la fecha")
				.obligatorio("direccion", evento.getDireccion(), 100, "Indica dónde se celebra")
				.si(evento.getTipoEvento() == null, "idTipo", "Elige un tipo de sesión");

		Integer duracion = evento.getDuracion();
		errores.si(duracion == null || duracion < 1, "duracion", "Indica la duración en minutos");

		Integer aforo = evento.getAforoMaximo();
		errores.si(aforo == null || aforo < 1, "aforoMaximo", "El aforo debe ser de al menos una persona")
				.si(aforo != null && aforo < plazasReservadas, "aforoMaximo", plazasReservadas == 1
						? "Ya hay una plaza reservada: el aforo no puede ser menor"
						: "Ya hay %d plazas reservadas: el aforo no puede ser menor".formatted(plazasReservadas));

		Integer minimo = evento.getMinimoAsistencia();
		errores.si(minimo != null && minimo < 0, "minimoAsistencia", "No puede ser negativo")
				.si(minimo != null && aforo != null && minimo > aforo, "minimoAsistencia",
						"No puede superar el aforo");

		BigDecimal precio = evento.getPrecio();
		errores.si(precio == null, "precio", "Indica el precio (0 si es gratuita)")
				.si(precio != null && precio.signum() < 0, "precio", "El precio no puede ser negativo")
				.si(precio != null && precio.compareTo(PRECIO_MAXIMO) > 0, "precio", "El precio es demasiado alto")
				.si(precio != null && precio.stripTrailingZeros().scale() > 2, "precio", "Como máximo dos decimales");

		errores.lanzarSiHay();
	}
}
