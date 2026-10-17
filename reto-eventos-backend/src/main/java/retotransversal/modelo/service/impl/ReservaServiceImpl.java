package retotransversal.modelo.service.impl;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.regex.Pattern;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import retotransversal.exception.ConflictoNegocioException;
import retotransversal.exception.OperacionNoPermitidaException;
import retotransversal.exception.RecursoNoEncontradoException;
import retotransversal.modelo.dto.AsistenteDto;
import retotransversal.modelo.dto.ReservaCrearDto;
import retotransversal.modelo.dto.ReservaEditarDto;
import retotransversal.modelo.entities.Asistente;
import retotransversal.modelo.entities.CanceladaPor;
import retotransversal.modelo.entities.Credencial;
import retotransversal.modelo.entities.EstadoEvento;
import retotransversal.modelo.entities.EstadoPago;
import retotransversal.modelo.entities.Evento;
import retotransversal.modelo.entities.Reserva;
import retotransversal.modelo.entities.Usuario;
import retotransversal.modelo.repository.ReservaRepository;
import retotransversal.modelo.service.ErroresCampos;
import retotransversal.modelo.service.EventoService;
import retotransversal.modelo.service.ReservaService;
import retotransversal.modelo.service.PagosReservasService;
import retotransversal.modelo.service.UsuarioService;

@Service
@RequiredArgsConstructor
public class ReservaServiceImpl implements ReservaService {

	/** Un teléfono de cualquier parte: el prefijo con + si hace falta, cifras, espacios, guiones y paréntesis. */
	private static final Pattern TELEFONO = Pattern.compile("\\+?[0-9 ()-]{6,20}");

	private final ReservaRepository reservaRepository;
	private final EventoService eventoService;
	private final UsuarioService usuarioService;
	private final PagosReservasService pagos;

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
	@Transactional
	public List<Reserva> findByUsuario(String username) {
		// Quien vuelve de pagar ve su reserva ya pagada, aunque el aviso de Stripe no haya llegado.
		return reservaRepository.findByUsuarioUsername(username).stream().map(pagos::alDia).toList();
	}

	@Override
	public List<Reserva> findTodas() {
		return reservaRepository.findAll(Sort.by(Sort.Order.desc("evento.fechaInicio"), Sort.Order.desc("idReserva")));
	}

	@Override
	@Transactional
	public Reserva reservarEvento(Integer idEvento, String username, Integer cantidad, String observaciones) {
		// Desde el panel (por teléfono, por ejemplo): se cobra al llegar.
		Reserva reserva = nueva(idEvento, username, cantidad, observaciones);
		reserva.setEstadoPago(EstadoPago.EN_TAQUILLA);
		return reservaRepository.save(reserva);
	}

	@Override
	@Transactional
	public Reserva reservarConRegistro(Integer idEvento, String username, ReservaCrearDto registro) {
		// Guardada primero (el pago necesita su localizador); si el pago no se puede abrir, se deshace todo.
		Reserva reserva = reservaRepository.save(registrar(idEvento, username, registro));
		pagos.abrirPago(reserva);
		return reservaRepository.save(reserva);
	}

	@Override
	@Transactional
	public Reserva reservarDemo(Integer idEvento, String username, ReservaCrearDto registro) {
		Reserva reserva = registrar(idEvento, username, registro);
		reserva.setEstadoPago(EstadoPago.PAGADA);
		reserva.setPagadaEn(LocalDateTime.now(EventoServiceImpl.ZONA).withNano(0));
		return reservaRepository.save(reserva);
	}

	/** La reserva con su registro de asistencia, comprobada y sin guardar. */
	private Reserva registrar(Integer idEvento, String username, ReservaCrearDto registro) {
		Integer cantidad = registro.getCantidad();
		Reserva reserva = nueva(idEvento, username, cantidad, registro.getObservaciones());

		List<AsistenteDto> asistentes = registro.getAsistentes() == null ? List.of() : registro.getAsistentes();
		ErroresCampos errores = new ErroresCampos()
				.si(asistentes.size() != cantidad, "asistentes", cantidad == 1
						? "Identifique al participante"
						: "Identifique a los %d participantes, uno por plaza".formatted(cantidad));
		for (int i = 0; i < asistentes.size(); i++) {
			AsistenteDto asistente = asistentes.get(i);
			String campo = "asistentes." + i + ".";
			errores.obligatorio(campo + "nombre", ErroresCampos.limpio(asistente.nombre()), 80,
					"Indique su nombre de identificación")
					.si(credencial(asistente.credencial()) == null, campo + "credencial", "Elija la credencial que presentará")
					.maximo(campo + "procedencia", ErroresCampos.limpio(asistente.procedencia()), 80)
					.maximo(campo + "incompatibilidades", ErroresCampos.limpio(asistente.incompatibilidades()), 300);
		}
		String telefono = ErroresCampos.limpio(registro.getTelefono());
		String material = ErroresCampos.limpio(registro.getMaterialDescripcion());
		errores.si(telefono == null, "telefono", "Indique un teléfono de contacto")
				.si(telefono != null && !TELEFONO.matcher(telefono).matches(), "telefono",
						"Escriba solo números, espacios y, si hace falta, el prefijo con +")
				.maximo("adaptaciones", ErroresCampos.limpio(registro.getAdaptaciones()), 500)
				.si(registro.isMaterialExterno() && material == null, "materialDescripcion",
						"Describa el material o equipamiento que introducirá")
				.maximo("materialDescripcion", material, 500)
				.si(!registro.isAceptaEdad(), "aceptaEdad", "Confirme la edad mínima de todos los participantes")
				.si(!registro.isAceptaCondiciones(), "aceptaCondiciones", "Acepte las condiciones de acceso")
				.lanzarSiHay();

		for (int i = 0; i < asistentes.size(); i++) {
			AsistenteDto asistente = asistentes.get(i);
			reserva.getAsistentes().add(Asistente.builder()
					.reserva(reserva)
					.orden(i + 1)
					.nombre(ErroresCampos.limpio(asistente.nombre()))
					.credencial(credencial(asistente.credencial()))
					.procedencia(ErroresCampos.limpio(asistente.procedencia()))
					.incompatibilidades(ErroresCampos.limpio(asistente.incompatibilidades()))
					.build());
		}
		reserva.setTelefono(telefono);
		reserva.setAdaptaciones(ErroresCampos.limpio(registro.getAdaptaciones()));
		reserva.setMaterialExterno(registro.isMaterialExterno());
		reserva.setMaterialDescripcion(registro.isMaterialExterno() ? material : null);
		reserva.setConformidadEn(LocalDateTime.now(EventoServiceImpl.ZONA).withNano(0));
		// Las comunicaciones solo se suman: no marcar la casilla no da de baja a nadie.
		if (registro.isAceptaComunicaciones()) {
			reserva.getUsuario().setAceptaComunicaciones(true);
		}
		return reserva;
	}

	/**
	 * La reserva, comprobada y sin guardar. La sesión se lee bloqueada: hasta que la transacción termine,
	 * ninguna otra reserva suya puede contar plazas, así que dos peticiones a la vez no pasan del aforo.
	 */
	private Reserva nueva(Integer idEvento, String username, Integer cantidad, String observaciones) {
		Evento evento = eventoService.bloquear(idEvento);
		Usuario usuario = usuarioService.findById(username);
		validarReserva(evento, username, cantidad);
		if (observaciones != null && observaciones.strip().length() > 200) {
			throw new ConflictoNegocioException("Las observaciones no pueden superar 200 caracteres");
		}
		return Reserva.builder()
				.evento(evento)
				.usuario(usuario)
				.cantidad(cantidad)
				.observaciones(observaciones == null || observaciones.isBlank() ? null : observaciones.strip())
				.precioVenta(evento.getPrecio().multiply(BigDecimal.valueOf(cantidad.longValue())))
				.build();
	}

	private static Credencial credencial(String valor) {
		try {
			return valor == null ? null : Credencial.valueOf(valor);
		} catch (IllegalArgumentException e) {
			return null;
		}
	}

	@Override
	@Transactional
	public Reserva editarReservaAdmin(Integer idReserva, ReservaEditarDto datos) {
		Reserva reserva = findById(idReserva);
		if (reserva.cancelada()) {
			throw new ConflictoNegocioException("Esta reserva está cancelada: se queda como estaba");
		}
		int cantidad = datos.cantidad() == null ? reserva.getCantidad() : datos.cantidad();
		Integer idEvento = datos.idEvento() == null ? reserva.getEvento().getIdEvento() : datos.idEvento();
		boolean mueve = !idEvento.equals(reserva.getEvento().getIdEvento()) || cantidad != reserva.getCantidad();
		BigDecimal antes = reserva.getPrecioVenta();
		if (mueve) {
			if (reserva.getEstadoPago() == EstadoPago.PENDIENTE) {
				throw new ConflictoNegocioException(
						"Está pendiente de pago: la sesión y las plazas se cambian cuando se pague o caduque el pago");
			}
			reubicar(reserva, eventoService.bloquear(idEvento), cantidad);
			// Ya cobrada, el importe puede bajar (se devuelve la diferencia), pero no subir: lo que falte se
			// reserva aparte y se paga aparte.
			if (reserva.getEstadoPago().cobrada() && reserva.getPrecioVenta().compareTo(antes) > 0) {
				throw new ConflictoNegocioException(
						"Ya está pagada y el importe subiría: añade las plazas en una reserva nueva");
			}
		}

		boolean material = datos.materialExterno() == null ? reserva.isMaterialExterno() : datos.materialExterno();
		String descripcion = datos.materialExterno() == null ? reserva.getMaterialDescripcion()
				: ErroresCampos.limpio(datos.materialDescripcion());
		validarDatos(reserva, datos, cantidad)
				.maximo("observaciones", ErroresCampos.limpio(datos.observaciones()), 200)
				.maximo("adaptaciones", ErroresCampos.limpio(datos.adaptaciones()), 500)
				.si(material && descripcion == null, "materialDescripcion",
						"Describa el material o equipamiento que introducirá")
				.maximo("materialDescripcion", descripcion, 500)
				.lanzarSiHay();

		reserva.setObservaciones(ErroresCampos.limpio(datos.observaciones()));
		String adaptacionesAntes = reserva.getAdaptaciones();
		boolean materialAntes = reserva.isMaterialExterno();
		String descripcionAntes = reserva.getMaterialDescripcion();
		if (datos.adaptaciones() != null) {
			reserva.setAdaptaciones(ErroresCampos.limpio(datos.adaptaciones()));
		}
		if (datos.materialExterno() != null) {
			reserva.setMaterialExterno(material);
			reserva.setMaterialDescripcion(material ? descripcion : null);
		}
		if (!Objects.equals(adaptacionesAntes, reserva.getAdaptaciones())
				|| materialAntes != reserva.isMaterialExterno()
				|| !Objects.equals(descripcionAntes, reserva.getMaterialDescripcion())) {
			reserva.reabrirRevision();
		}
		aplicarDatos(reserva, datos);
		// Lo último, cuando todo lo demás ya vale: una devolución no se deshace.
		pagos.devolver(reserva, antes.subtract(reserva.getPrecioVenta()));
		return reservaRepository.save(reserva);
	}

	/**
	 * Marca la entrada de un participante, o la deshace si se marcó por error. Se puede en cualquier
	 * momento: el panel es del personal, y así la demo se prueba con sesiones futuras.
	 */
	@Override
	@Transactional
	public Reserva marcarEntrada(Integer idReserva, Integer orden, boolean presente) {
		Reserva reserva = paraControl(idReserva);
		Asistente persona = reserva.getAsistentes().stream()
				.filter(asistente -> asistente.getOrden().equals(orden))
				.findFirst()
				.orElseThrow(() -> new RecursoNoEncontradoException("Ese participante no está en la reserva"));
		if (presente != (persona.getEntradaEn() != null)) {
			persona.setEntradaEn(presente ? LocalDateTime.now(EventoServiceImpl.ZONA).withNano(0) : null);
		}
		return reservaRepository.save(reserva);
	}

	@Override
	@Transactional
	public Reserva contarEntradas(Integer idReserva, int plazas) {
		Reserva reserva = paraControl(idReserva);
		if (!reserva.getAsistentes().isEmpty()) {
			throw new ConflictoNegocioException("Sus participantes están registrados: se marcan uno a uno");
		}
		if (plazas < 0 || plazas > reserva.getCantidad()) {
			throw new ConflictoNegocioException(reserva.getCantidad() == 1 ? "La reserva tiene 1 plaza"
					: "La reserva tiene %d plazas".formatted(reserva.getCantidad()));
		}
		reserva.setEntradasSinRegistrar(plazas);
		return reservaRepository.save(reserva);
	}

	/** Solo entran las reservas vivas de sesiones que no se han cancelado. */
	private Reserva paraControl(Integer idReserva) {
		Reserva reserva = findById(idReserva);
		if (reserva.cancelada()) {
			throw new ConflictoNegocioException("Esta reserva está cancelada");
		}
		if (reserva.getEvento().getEstado() == EstadoEvento.CANCELADO) {
			throw new ConflictoNegocioException("Su sesión está cancelada");
		}
		return reserva;
	}

	@Override
	@Transactional
	public Reserva revisar(Integer idReserva, boolean aceptada, String nota) {
		Reserva reserva = findById(idReserva);
		if (reserva.cancelada() || !reserva.pideAdaptaciones()) {
			throw new ConflictoNegocioException("Esta reserva no tiene adaptaciones ni material que revisar");
		}
		String limpia = ErroresCampos.limpio(nota);
		new ErroresCampos()
				.si(!aceptada && limpia == null, "nota", "Explica al cliente por qué no se aceptan")
				.maximo("nota", limpia, 300)
				.lanzarSiHay();
		reserva.setRevisionAceptada(aceptada);
		reserva.setRevisionNota(limpia);
		reserva.setRevisadaEn(LocalDateTime.now(EventoServiceImpl.ZONA).withNano(0));
		return reservaRepository.save(reserva);
	}

	/**
	 * Deshace una cancelación (un error, o un cliente que cambia de idea), con las reglas de una reserva
	 * nueva: sesión activa, plazas libres (leídas con la sesión bloqueada) y diez por persona. Solo si no
	 * se movió dinero: si se devolvió, o si nunca se llegó a pagar, lo limpio es una reserva nueva.
	 */
	@Override
	@Transactional
	public Reserva reactivar(Integer idReserva) {
		Reserva reserva = findById(idReserva);
		if (!reserva.cancelada()) {
			throw new ConflictoNegocioException("Esta reserva no está cancelada");
		}
		if (reserva.getEstadoPago() == EstadoPago.PENDIENTE) {
			throw new ConflictoNegocioException("No se llegó a pagar: crea una reserva nueva");
		}
		if (reserva.getImporteDevuelto().signum() > 0) {
			throw new ConflictoNegocioException("Ya se devolvió su importe: crea una reserva nueva");
		}
		Evento evento = eventoService.bloquear(reserva.getEvento().getIdEvento());
		if (evento.getEstado() != EstadoEvento.ACTIVO) {
			throw new ConflictoNegocioException("Su sesión ya no está activa");
		}
		int ocupadas = reservaRepository.findByEventoIdEventoAndCanceladaEnIsNull(evento.getIdEvento()).stream()
				.mapToInt(Reserva::getCantidad).sum();
		if (ocupadas + reserva.getCantidad() > evento.getAforoMaximo()) {
			throw new ConflictoNegocioException("Ya no quedan plazas suficientes en su sesión");
		}
		int delCliente = reservaRepository.findByUsuarioUsernameAndEventoIdEventoAndCanceladaEnIsNull(
				reserva.getUsuario().getUsername(), evento.getIdEvento()).stream().mapToInt(Reserva::getCantidad).sum();
		if (delCliente + reserva.getCantidad() > 10) {
			throw new ConflictoNegocioException("Como máximo 10 plazas por persona en la misma sesión");
		}
		reserva.reactivar();
		return reservaRepository.save(reserva);
	}

	/** Cobrada en taquilla: lo que el admin marca cuando quien reservó por teléfono paga al llegar. */
	@Override
	@Transactional
	public Reserva marcarCobrada(Integer idReserva) {
		Reserva reserva = findById(idReserva);
		if (reserva.cancelada() || reserva.getEstadoPago() != EstadoPago.EN_TAQUILLA) {
			throw new ConflictoNegocioException("Solo se marcan como cobradas las reservas pendientes de pago en taquilla");
		}
		reserva.setEstadoPago(EstadoPago.COBRADA_TAQUILLA);
		reserva.setPagadaEn(LocalDateTime.now(EventoServiceImpl.ZONA).withNano(0));
		return reservaRepository.save(reserva);
	}

	/**
	 * Cambia la sesión o las plazas con las reglas de una reserva nueva, salvo el cierre de 10 minutos
	 * (en la puerta se puede sumar a alguien). La sesión llega bloqueada y la propia reserva no cuenta:
	 * pasar de 4 a 5 plazas pide una libre, no cinco. El importe se recalcula con el precio de la sesión.
	 */
	private void reubicar(Reserva reserva, Evento evento, int cantidad) {
		if (cantidad < 1 || cantidad > 10) {
			throw new ConflictoNegocioException("Una reserva tiene de 1 a 10 plazas");
		}
		if (evento.getEstado() != EstadoEvento.ACTIVO) {
			throw new ConflictoNegocioException("Esa sesión ya no admite reservas");
		}
		List<Reserva> otras = reservaRepository.findByEventoIdEventoAndCanceladaEnIsNull(evento.getIdEvento()).stream()
				.filter(otra -> !otra.getIdReserva().equals(reserva.getIdReserva()))
				.toList();
		int ocupadas = otras.stream().mapToInt(Reserva::getCantidad).sum();
		if (ocupadas + cantidad > evento.getAforoMaximo()) {
			int libres = Math.max(0, evento.getAforoMaximo() - ocupadas);
			throw new ConflictoNegocioException(libres == 1 ? "En esa sesión solo queda 1 plaza libre"
					: "En esa sesión solo quedan %d plazas libres".formatted(libres));
		}
		String username = reserva.getUsuario().getUsername();
		int delCliente = otras.stream().filter(otra -> otra.getUsuario().getUsername().equals(username))
				.mapToInt(Reserva::getCantidad).sum();
		if (delCliente + cantidad > 10) {
			throw new ConflictoNegocioException("Como máximo 10 plazas por persona en la misma sesión");
		}
		reserva.setEvento(evento);
		reserva.setCantidad(cantidad);
		reserva.setPrecioVenta(evento.getPrecio().multiply(BigDecimal.valueOf(cantidad)));
	}

	/**
	 * El cliente corrige sus datos con el mismo plazo que tiene para cancelar: hasta el día anterior.
	 * El teléfono sigue siendo obligatorio, como en el registro, y las observaciones son del personal.
	 */
	@Override
	@Transactional
	public Reserva editarReservaPropia(Integer idReserva, String username, ReservaEditarDto datos) {
		Reserva reserva = findById(idReserva);
		if (!reserva.getUsuario().getUsername().equals(username)) {
			throw new OperacionNoPermitidaException("Solo puedes modificar tus propias reservas");
		}
		comprobarViva(reserva, "La sesión ya no está activa: la reserva se queda en tu historial");
		if (!eventoService.admiteCancelaciones(reserva.getEvento())) {
			throw new ConflictoNegocioException("Los datos de la reserva se pueden modificar hasta el día anterior a la sesión");
		}
		validarDatos(reserva, datos, reserva.getCantidad())
				.si(ErroresCampos.limpio(datos.telefono()) == null, "telefono", "Indique un teléfono de contacto")
				.lanzarSiHay();
		aplicarDatos(reserva, datos);
		return reservaRepository.save(reserva);
	}

	/** El teléfono y los participantes, con las reglas del registro de asistencia. No cambia nada. */
	private ErroresCampos validarDatos(Reserva reserva, ReservaEditarDto datos, int cantidad) {
		List<AsistenteDto> asistentes = datos.asistentes() == null ? List.of() : datos.asistentes();
		String telefono = ErroresCampos.limpio(datos.telefono());
		ErroresCampos errores = new ErroresCampos()
				.si(telefono != null && !TELEFONO.matcher(telefono).matches(), "telefono",
						"Escriba un teléfono de 6 a 20 caracteres con números, espacios y prefijo si procede")
				.si(!asistentes.isEmpty() && asistentes.size() != cantidad, "asistentes",
						"Complete un participante por plaza")
				.si(asistentes.isEmpty() && !reserva.getAsistentes().isEmpty(), "asistentes",
						"Los participantes ya registrados deben conservar sus datos de identificación");
		for (int i = 0; i < asistentes.size(); i++) {
			AsistenteDto persona = asistentes.get(i);
			String campo = "asistentes." + i + ".";
			if (persona == null) {
				errores.si(true, campo + "nombre", "Identifique al participante");
				continue;
			}
			errores.obligatorio(campo + "nombre", ErroresCampos.limpio(persona.nombre()), 80, "Indique su nombre")
					.si(credencial(persona.credencial()) == null, campo + "credencial", "Elija una credencial")
					.maximo(campo + "procedencia", ErroresCampos.limpio(persona.procedencia()), 80)
					.maximo(campo + "incompatibilidades", ErroresCampos.limpio(persona.incompatibilidades()), 300);
		}
		return errores;
	}

	private void aplicarDatos(Reserva reserva, ReservaEditarDto datos) {
		List<AsistenteDto> asistentes = datos.asistentes() == null ? List.of() : datos.asistentes();
		reserva.setTelefono(ErroresCampos.limpio(datos.telefono()));
		// Se reutilizan las filas que ya existen, para no cambiar sus identificadores.
		for (int i = 0; i < asistentes.size(); i++) {
			AsistenteDto datosPersona = asistentes.get(i);
			Asistente persona;
			if (i < reserva.getAsistentes().size()) {
				persona = reserva.getAsistentes().get(i);
			} else {
				persona = Asistente.builder().reserva(reserva).orden(i + 1).build();
				reserva.getAsistentes().add(persona);
			}
			persona.setNombre(ErroresCampos.limpio(datosPersona.nombre()));
			persona.setCredencial(credencial(datosPersona.credencial()));
			persona.setProcedencia(ErroresCampos.limpio(datosPersona.procedencia()));
			persona.setIncompatibilidades(ErroresCampos.limpio(datosPersona.incompatibilidades()));
		}
		// Con menos plazas, sobran los últimos participantes.
		if (!asistentes.isEmpty() && reserva.getAsistentes().size() > asistentes.size()) {
			reserva.getAsistentes().subList(asistentes.size(), reserva.getAsistentes().size()).clear();
		}
	}

	@Override
	@Transactional
	public int cancelarReserva(Integer idReserva, String username) {
		Reserva reserva = findById(idReserva);
		if (!reserva.getUsuario().getUsername().equals(username)) {
			throw new OperacionNoPermitidaException("Solo puedes cancelar tus propias reservas");
		}
		comprobarViva(reserva, "La sesión ya no está activa: la reserva se queda en tu historial");
		if (!eventoService.admiteCancelaciones(reserva.getEvento())) {
			throw new ConflictoNegocioException("Las reservas se pueden cancelar hasta el día anterior a la sesión");
		}
		// Hasta el día anterior, el cliente recupera todo lo pagado.
		pagos.cerrarPendiente(reserva);
		pagos.devolver(reserva, pendienteDeDevolver(reserva));
		cancelar(reserva, CanceladaPor.CLIENTE, null);
		return 1;
	}

	/**
	 * Desde el panel, en cualquier momento antes de la sesión, siempre con su motivo. Lo cobrado se devuelve
	 * salvo que se diga lo contrario (una reserva duplicada, por ejemplo, cuyo pago vale para la otra).
	 */
	@Override
	@Transactional
	public Reserva cancelarReservaAdmin(Integer idReserva, String motivo, boolean devolver) {
		Reserva reserva = findById(idReserva);
		comprobarViva(reserva, "La sesión ya no está activa: la reserva se queda como está");
		String limpio = ErroresCampos.limpio(motivo);
		new ErroresCampos().obligatorio("motivo", limpio, 200, "Indica el motivo de la cancelación").lanzarSiHay();
		pagos.cerrarPendiente(reserva);
		if (devolver) {
			pagos.devolver(reserva, pendienteDeDevolver(reserva));
		}
		return cancelar(reserva, CanceladaPor.ALIENMILK, limpio);
	}

	/** Lo cobrado que aún no se ha devuelto. */
	private static BigDecimal pendienteDeDevolver(Reserva reserva) {
		return reserva.getPrecioVenta().subtract(reserva.getImporteDevuelto()).max(BigDecimal.ZERO);
	}

	/** Cancelar no borra: la reserva deja de ocupar plazas y se queda con quién, cuándo y por qué. */
	private Reserva cancelar(Reserva reserva, CanceladaPor quien, String motivo) {
		reserva.cancelar(quien, motivo, LocalDateTime.now(EventoServiceImpl.ZONA).withNano(0));
		return reservaRepository.save(reserva);
	}

	/** Solo se cambian las reservas vivas de sesiones activas: lo demás es historial. */
	private static void comprobarViva(Reserva reserva, String siNoActiva) {
		if (reserva.cancelada()) {
			throw new ConflictoNegocioException("Esta reserva ya está cancelada");
		}
		if (reserva.getEvento().getEstado() != EstadoEvento.ACTIVO) {
			throw new ConflictoNegocioException(siNoActiva);
		}
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

		int aforoReservado = reservaRepository.findByEventoIdEventoAndCanceladaEnIsNull(evento.getIdEvento())
				.stream()
				.mapToInt(Reserva::getCantidad)
				.sum();

		if (aforoReservado + cantidad > evento.getAforoMaximo()) {
			throw new ConflictoNegocioException("No quedan plazas suficientes en esta sesión");
		}

		int entradasUsuario = reservaRepository.findByUsuarioUsernameAndEventoIdEventoAndCanceladaEnIsNull(username, evento.getIdEvento())
				.stream()
				.mapToInt(Reserva::getCantidad)
				.sum();

		if (entradasUsuario + cantidad > 10) {
			throw new ConflictoNegocioException("Como máximo 10 plazas por persona en la misma sesión");
		}
	}
}
