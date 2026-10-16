package retotransversal.modelo.service.impl;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
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
import retotransversal.modelo.entities.Asistente;
import retotransversal.modelo.entities.Credencial;
import retotransversal.modelo.entities.EstadoEvento;
import retotransversal.modelo.entities.Evento;
import retotransversal.modelo.entities.Reserva;
import retotransversal.modelo.entities.Usuario;
import retotransversal.modelo.repository.ReservaRepository;
import retotransversal.modelo.service.ErroresCampos;
import retotransversal.modelo.service.EventoService;
import retotransversal.modelo.service.ReservaService;
import retotransversal.modelo.service.UsuarioService;

@Service
@RequiredArgsConstructor
public class ReservaServiceImpl implements ReservaService {

	/** Un teléfono de cualquier parte: el prefijo con + si hace falta, cifras, espacios, guiones y paréntesis. */
	private static final Pattern TELEFONO = Pattern.compile("\\+?[0-9 ()-]{6,20}");

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
		return reservaRepository.save(nueva(idEvento, username, cantidad, observaciones));
	}

	@Override
	@Transactional
	public Reserva reservarConRegistro(Integer idEvento, String username, ReservaCrearDto registro) {
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
		return reservaRepository.save(reserva);
	}

	/** La reserva, comprobada (aforo, diez por persona, cierre) y sin guardar todavía. */
	private Reserva nueva(Integer idEvento, String username, Integer cantidad, String observaciones) {
		Evento evento = eventoService.findById(idEvento);
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
