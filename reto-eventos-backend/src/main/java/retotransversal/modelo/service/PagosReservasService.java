package retotransversal.modelo.service;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import retotransversal.exception.ConflictoNegocioException;
import retotransversal.exception.RecursoNoEncontradoException;
import retotransversal.modelo.entities.CanceladaPor;
import retotransversal.modelo.entities.Devolucion;
import retotransversal.modelo.entities.EstadoPago;
import retotransversal.modelo.entities.Evento;
import retotransversal.modelo.entities.Reserva;
import retotransversal.modelo.pagos.EstadoSesionPago;
import retotransversal.modelo.pagos.PagoNoDisponibleException;
import retotransversal.modelo.pagos.PasarelaPago;
import retotransversal.modelo.pagos.SesionPago;
import retotransversal.modelo.repository.ReservaRepository;
import retotransversal.modelo.service.impl.EventoServiceImpl;

/**
 * El cobro de las reservas con la misma pasarela que la tienda. Una reserva hecha en la web queda
 * pendiente de pago y guarda sus plazas mientras se puede pagar (30 minutos); pagada, se confirma, y si
 * nadie la paga, se anula sola y las libera. Lo que dice la pasarela manda: los avisos solo dicen que
 * algo cambió y aquí se pregunta en qué quedó. Sin pasarela (sin clave de Stripe), las reservas se
 * confirman sin cobrar, como en la tienda.
 */
@Service
public class PagosReservasService {

	private static final Logger log = LoggerFactory.getLogger(PagosReservasService.class);

	private final ReservaRepository reservaRepository;
	private final EventoService eventoService;
	private final PasarelaPago pasarela;
	private final Clock reloj;

	@Autowired
	public PagosReservasService(ReservaRepository reservaRepository, EventoService eventoService,
			ObjectProvider<PasarelaPago> pasarela) {
		this(reservaRepository, eventoService, pasarela.getIfAvailable(), Clock.system(EventoServiceImpl.ZONA));
	}

	public PagosReservasService(ReservaRepository reservaRepository, EventoService eventoService, PasarelaPago pasarela,
			Clock reloj) {
		this.reservaRepository = reservaRepository;
		this.eventoService = eventoService;
		this.pasarela = pasarela;
		this.reloj = reloj;
	}

	/** El localizador que ven Stripe y el cliente en su recibo: AM-R-0007. */
	public static String referencia(Reserva reserva) {
		return "AM-R-%04d".formatted(reserva.getIdReserva());
	}

	/**
	 * Una reserva recién guardada desde la web: con pasarela, abre su pago y queda pendiente; sin ella,
	 * queda confirmada sin cobrar. Si la pasarela falla, la excepción deshace la reserva entera.
	 */
	public void abrirPago(Reserva reserva) {
		if (pasarela == null) {
			reserva.setEstadoPago(EstadoPago.PAGADA);
			reserva.setPagadaEn(ahora());
			return;
		}
		Evento sesion = reserva.getEvento();
		SesionPago pago = pasarela.abrirReserva(referencia(reserva),
				"%s · %s".formatted(sesion.getNombre(), sesion.getFechaInicio()),
				sesion.getPrecio(), reserva.getCantidad(), reserva.getUsuario().getEmail(),
				"/cuenta/reservas?reserva=" + reserva.getIdReserva());
		reserva.setEstadoPago(EstadoPago.PENDIENTE);
		reserva.setPagoSesion(pago.id());
		reserva.setPagoUrl(pago.url());
		reserva.setPagoCaducaEn(LocalDateTime.ofInstant(pago.caducaEn(), reloj.getZone()));
	}

	/**
	 * Pone al día una reserva pendiente para quien vuelve de pagar antes de que llegue el aviso (o cuando
	 * no llega). Si la pasarela no contesta, se queda como estaba.
	 */
	public Reserva alDia(Reserva reserva) {
		if (reserva.getEstadoPago() != EstadoPago.PENDIENTE || reserva.cancelada()) {
			return reserva;
		}
		try {
			return sincronizar(reserva);
		} catch (PagoNoDisponibleException e) {
			log.warn("No se ha podido consultar el pago de la reserva {}", referencia(reserva), e);
			return reserva;
		}
	}

	/** El aviso de la pasarela (ver TiendaServiceImpl.recibirAvisoPago): si la sesión es de una reserva. */
	public boolean recibirAviso(String sesion) {
		return reservaRepository.findByPagoSesion(sesion).map(reserva -> {
			sincronizar(reserva);
			return true;
		}).orElse(false);
	}

	@Transactional(readOnly = true)
	public List<Integer> pagosVencidos() {
		if (pasarela == null) {
			return List.of();
		}
		return reservaRepository
				.findByEstadoPagoAndPagoCaducaEnBeforeAndCanceladaEnIsNull(EstadoPago.PENDIENTE, ahora()).stream()
				.map(Reserva::getIdReserva)
				.toList();
	}

	@Transactional
	public void repasar(Integer idReserva) {
		reservaRepository.findById(idReserva).ifPresent(this::sincronizar);
	}

	/**
	 * Antes de cancelar una reserva pendiente, cierra su página de pago para que nadie la pague después.
	 * Si ya no estaba abierta, lo normal es que se acabe de pagar: entonces sigue como pagada (y quien
	 * cancela devolverá el dinero); si había caducado, ya está anulada.
	 */
	public void cerrarPendiente(Reserva reserva) {
		if (reserva.getEstadoPago() != EstadoPago.PENDIENTE || pasarela == null || reserva.getPagoSesion() == null) {
			return;
		}
		try {
			pasarela.caducar(reserva.getPagoSesion());
		} catch (PagoNoDisponibleException e) {
			sincronizar(reserva);
			if (reserva.getEstadoPago() == EstadoPago.PENDIENTE && !reserva.cancelada()) {
				throw e;
			}
		}
	}

	/**
	 * Devuelve parte o todo lo cobrado y lo deja registrado (ver Devolucion). Con tarjeta, por la pasarela,
	 * y queda hecha con su referencia; cobrado en taquilla, queda pendiente hasta que alguien entregue el
	 * dinero y lo marque. Si la pasarela falla, la excepción deshace la operación que lo pidió; si la base
	 * falla después, repetirla no devuelve dos veces (ver la clave).
	 */
	public void devolver(Reserva reserva, BigDecimal importe, String motivo) {
		if (importe.signum() <= 0 || !reserva.getEstadoPago().cobrada()) {
			return;
		}
		BigDecimal devuelto = reserva.getImporteDevuelto().add(importe);
		Devolucion devolucion = Devolucion.builder()
				.reserva(reserva)
				.importe(importe)
				.motivo(motivo)
				.creadaEn(ahora())
				.build();
		if (reserva.getEstadoPago() == EstadoPago.COBRADA_TAQUILLA) {
			devolucion.setMedio(Devolucion.Medio.TAQUILLA);
			devolucion.setEstado(Devolucion.Estado.PENDIENTE);
		} else {
			devolucion.setMedio(Devolucion.Medio.TARJETA);
			devolucion.setEstado(Devolucion.Estado.HECHA);
			devolucion.setHechaEn(ahora());
			// Sin cobro en Stripe (reservas de ejemplo, o la web sin el pago activado) no hay nada que mover.
			if (reserva.getPagoId() != null) {
				if (pasarela == null) {
					throw new ConflictoNegocioException("Ahora mismo no podemos devolver el pago. Inténtelo más tarde.");
				}
				// La clave lleva lo devuelto en total: un reintento no devuelve dos veces, otra devolución sí.
				devolucion.setReferencia(pasarela.reembolsar(reserva.getPagoId(), importe,
						"reembolso-%s-%s".formatted(referencia(reserva), devuelto.toPlainString())));
			}
		}
		reserva.getDevoluciones().add(devolucion);
		reserva.setImporteDevuelto(devuelto);
		log.info("Reserva {}: {} € a devolver por {} ({})", referencia(reserva), importe, devolucion.getMedio(), motivo);
	}

	/** El dinero de una devolución en taquilla ya se ha entregado. */
	@Transactional
	public Reserva entregarDevolucion(Integer idReserva, Integer idDevolucion) {
		Reserva reserva = reservaRepository.findById(idReserva)
				.orElseThrow(() -> new RecursoNoEncontradoException("Reserva no encontrada"));
		Devolucion devolucion = reserva.getDevoluciones().stream()
				.filter(item -> item.getIdDevolucion().equals(idDevolucion))
				.findFirst()
				.orElseThrow(() -> new RecursoNoEncontradoException("Esa devolución no es de esta reserva"));
		if (devolucion.getEstado() == Devolucion.Estado.HECHA) {
			throw new ConflictoNegocioException("Esa devolución ya está hecha");
		}
		devolucion.setEstado(Devolucion.Estado.HECHA);
		devolucion.setHechaEn(ahora());
		return reservaRepository.save(reserva);
	}

	/**
	 * Cancelar una sesión devuelve el dinero de todas sus reservas: no las cancela (no lo hizo el cliente),
	 * pero ya no se cobra nada. Las pendientes se anulan, para que nadie pague una sesión cancelada.
	 */
	@Transactional
	public Evento cancelarSesion(Integer idEvento) {
		Evento evento = eventoService.cancelarEvento(idEvento);
		for (Reserva reserva : reservaRepository.findByEventoIdEventoAndCanceladaEnIsNull(idEvento)) {
			cerrarPendiente(reserva);
			if (reserva.getEstadoPago() == EstadoPago.PENDIENTE) {
				reserva.cancelar(CanceladaPor.SISTEMA, "La sesión se canceló antes del pago", ahora());
			} else if (!reserva.cancelada()) {
				devolver(reserva, reserva.getPrecioVenta().subtract(reserva.getImporteDevuelto()).max(BigDecimal.ZERO),
						"Sesión cancelada por AlienMilk");
			}
			reservaRepository.save(reserva);
		}
		return evento;
	}

	/**
	 * Reactivar una sesión no vuelve a cobrar: las reservas cuyo dinero se devolvió al cancelarla pasan a
	 * canceladas, y sus plazas, libres. Las que no se habían cobrado (en taquilla) siguen como estaban.
	 */
	@Transactional
	public Evento reactivarSesion(Integer idEvento) {
		Evento evento = eventoService.reactivarEvento(idEvento);
		for (Reserva reserva : reservaRepository.findByEventoIdEventoAndCanceladaEnIsNull(idEvento)) {
			boolean devuelta = reserva.getEstadoPago().cobrada()
					&& reserva.getImporteDevuelto().compareTo(reserva.getPrecioVenta()) >= 0;
			if (devuelta) {
				reserva.cancelar(CanceladaPor.SISTEMA, "Se devolvió el importe al cancelar la sesión", ahora());
				reservaRepository.save(reserva);
			}
		}
		return evento;
	}

	/**
	 * Lleva una reserva pendiente al estado de su sesión de pago: pagada, confirmada; caducada, anulada y
	 * con sus plazas libres. Bloquea antes la fila: el aviso, la consulta y una cancelación pueden llegar
	 * a la vez, y solo el primero cambia el estado.
	 */
	private Reserva sincronizar(Reserva reserva) {
		reservaRepository.findByIdBloqueando(reserva.getIdReserva());
		if (pasarela == null || reserva.getEstadoPago() != EstadoPago.PENDIENTE || reserva.cancelada()
				|| reserva.getPagoSesion() == null) {
			return reserva;
		}
		EstadoSesionPago sesion = pasarela.consultar(reserva.getPagoSesion());
		switch (sesion.estado()) {
			case PAGADA -> {
				reserva.setEstadoPago(EstadoPago.PAGADA);
				reserva.setPagoId(sesion.pago());
				reserva.setPagadaEn(ahora());
				reserva.setPagoUrl(null);
				log.info("Reserva {} pagada", referencia(reserva));
			}
			case CADUCADA -> {
				reserva.cancelar(CanceladaPor.SISTEMA, "No se completó el pago a tiempo", ahora());
				log.info("Reserva {} anulada: nadie la pagó a tiempo", referencia(reserva));
			}
			case ABIERTA -> {
				// Aún se puede pagar.
			}
		}
		return reservaRepository.save(reserva);
	}

	private LocalDateTime ahora() {
		return LocalDateTime.now(reloj).withNano(0);
	}
}
