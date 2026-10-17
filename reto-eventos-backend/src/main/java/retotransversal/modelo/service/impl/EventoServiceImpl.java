package retotransversal.modelo.service.impl;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
public class EventoServiceImpl implements EventoService {

	/** El precio se guarda con DECIMAL(9, 2). */
	private static final BigDecimal PRECIO_MAXIMO = new BigDecimal("9999999.99");

	/** Las sesiones son en hora peninsular: el día cambia a medianoche de Madrid. */
	public static final ZoneId ZONA = ZoneId.of("Europe/Madrid");

	/** Las reservas cierran con el control de ingreso, estos minutos antes de empezar. */
	public static final int MINUTOS_CIERRE_RESERVAS = 10;

	private final EventoRepository eventoRepository;
	private final ReservaRepository reservaRepository;
	private final Clock reloj;

	@Autowired
	public EventoServiceImpl(EventoRepository eventoRepository, ReservaRepository reservaRepository) {
		this(eventoRepository, reservaRepository, Clock.system(ZONA));
	}

	public EventoServiceImpl(EventoRepository eventoRepository, ReservaRepository reservaRepository, Clock reloj) {
		this.eventoRepository = eventoRepository;
		this.reservaRepository = reservaRepository;
		this.reloj = reloj;
	}

	@Override
	public Evento findById(Integer id) {
		return eventoRepository.findById(id)
				.orElseThrow(() -> new RecursoNoEncontradoException("Evento no encontrado"));
	}

	@Override
	public List<Evento> findAll() {
		return eventoRepository.findAll();
	}

	/** Una sesión nueva siempre empieza activa, y no puede ser de una fecha que ya pasó. */
	@Override
	public Evento insertOne(Evento entidad) {
		limpiar(entidad);
		validar(entidad, 0, null);
		entidad.setEstado(EstadoEvento.ACTIVO);
		return eventoRepository.save(entidad);
	}

	/**
	 * Editar no cambia el estado: una sesión cancelada sigue cancelada hasta que se reactive. El aforo
	 * no puede quedar por debajo de las plazas ya reservadas. La fecha solo puede cambiar a una que no
	 * haya pasado; la que ya tenía se respeta, para poder corregir otros datos de una sesión celebrada.
	 */
	@Override
	@Transactional
	public Evento updateOne(Evento entidad) {
		// Bloqueada: una reserva que entre a la vez no puede dejar el aforo nuevo por debajo de lo reservado.
		Evento actual = bloquear(entidad.getIdEvento());
		limpiar(entidad);
		validar(entidad, plazasReservadas(actual.getIdEvento()), actual.inicio());
		entidad.setEstado(actual.getEstado());
		entidad.setImagen(actual.getImagen());
		entidad.setArchivada(actual.isArchivada());
		return eventoRepository.save(entidad);
	}

	/**
	 * Una sesión con reservas no se borra por descuido: se pide confirmarlo aparte (borrarConReservas)
	 * o cancelarla, y entonces las reservas se quedan en el historial de sus clientes.
	 */
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
	@Transactional
	public int borrarConReservas(Integer idEvento) {
		findById(idEvento);
		reservaRepository.deleteAll(reservaRepository.findByEventoIdEvento(idEvento));
		eventoRepository.deleteById(idEvento);
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
	public Evento archivar(Integer idEvento, boolean archivada) {
		Evento evento = findById(idEvento);
		if (archivada && evento.getEstado() == EstadoEvento.ACTIVO) {
			throw new ConflictoNegocioException("Una sesión activa no se archiva: cancélala o espera a que termine");
		}
		evento.setArchivada(archivada);
		return eventoRepository.save(evento);
	}

	@Override
	public Evento reactivarEvento(Integer idEvento) {
		Evento evento = findById(idEvento);
		if (evento.getEstado() != EstadoEvento.CANCELADO) {
			throw new ConflictoNegocioException("Solo se puede reactivar una sesión cancelada");
		}
		if (evento.isArchivada()) {
			throw new ConflictoNegocioException("Está archivada: sácala del archivo antes de reactivarla");
		}
		if (haEmpezado(evento)) {
			throw new ConflictoNegocioException("Su fecha ya pasó: cámbiala antes de reactivarla");
		}
		evento.setEstado(EstadoEvento.ACTIVO);
		return eventoRepository.save(evento);
	}

	@Override
	@Transactional
	public int terminarCelebradas() {
		LocalDateTime ahora = ahora();
		List<Evento> acabadas = eventoRepository.findByEstadoAndFechaInicioLessThanEqual(EstadoEvento.ACTIVO, hoy())
				.stream()
				.filter(evento -> !evento.fin().isAfter(ahora))
				.toList();
		acabadas.forEach(evento -> evento.setEstado(EstadoEvento.TERMINADO));
		eventoRepository.saveAll(acabadas);
		return acabadas.size();
	}

	@Override
	public Evento bloquear(Integer idEvento) {
		return eventoRepository.findByIdBloqueando(idEvento)
				.orElseThrow(() -> new RecursoNoEncontradoException("Evento no encontrado"));
	}

	@Override
	public boolean haEmpezado(Evento evento) {
		return !evento.inicio().isAfter(ahora());
	}

	@Override
	public boolean admiteReservas(Evento evento) {
		return ahora().isBefore(evento.inicio().minusMinutes(MINUTOS_CIERRE_RESERVAS));
	}

	@Override
	public boolean admiteCancelaciones(Evento evento) {
		return hoy().isBefore(evento.getFechaInicio());
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
		List<Reserva> reservas = reservaRepository.findByEventoIdEventoAndCanceladaEnIsNull(evento.getIdEvento());
		return EventoAdminDto.de(evento, reservas.stream().mapToLong(Reserva::getCantidad).sum(), reservas.size());
	}

	private LocalDateTime ahora() {
		return LocalDateTime.now(reloj).withSecond(0).withNano(0);
	}

	private LocalDate hoy() {
		return LocalDate.now(reloj);
	}

	private int plazasReservadas(Integer idEvento) {
		return reservaRepository.findByEventoIdEventoAndCanceladaEnIsNull(idEvento).stream().mapToInt(Reserva::getCantidad).sum();
	}

	private static void limpiar(Evento evento) {
		evento.setNombre(ErroresCampos.limpio(evento.getNombre()));
		evento.setDescripcion(ErroresCampos.limpio(evento.getDescripcion()));
		evento.setDireccion(ErroresCampos.limpio(evento.getDireccion()));
	}

	/**
	 * Un inicio que ya pasó solo se acepta si es el que ya tenía (editar una sesión celebrada sin moverla).
	 * Si el día ya pasó, el aviso va a la fecha; si es hoy y la hora ya pasó, a la hora.
	 */
	private void validar(Evento evento, int plazasReservadas, LocalDateTime inicioActual) {
		LocalDate fecha = evento.getFechaInicio();
		LocalTime hora = evento.getHoraInicio();
		boolean movida = fecha != null && hora != null && !evento.inicio().equals(inicioActual);
		boolean pasada = movida && !evento.inicio().isAfter(ahora());
		ErroresCampos errores = new ErroresCampos()
				.obligatorio("nombre", evento.getNombre(), 50, "Escribe el nombre de la sesión")
				.maximo("descripcion", evento.getDescripcion(), 200)
				.si(fecha == null, "fechaInicio", "Indica la fecha")
				.si(pasada && fecha.isBefore(hoy()), "fechaInicio", "Esa fecha ya ha pasado")
				.si(hora == null, "horaInicio", "Indica la hora de inicio")
				.si(pasada && fecha.equals(hoy()), "horaInicio", "Esa hora de hoy ya ha pasado")
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
