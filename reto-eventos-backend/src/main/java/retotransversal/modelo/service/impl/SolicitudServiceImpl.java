package retotransversal.modelo.service.impl;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.extern.slf4j.Slf4j;
import retotransversal.exception.DatosNoValidosException;
import retotransversal.exception.RecursoNoEncontradoException;
import retotransversal.modelo.dto.SolicitudDto;
import retotransversal.modelo.dto.SolicitudPayloadDto;
import retotransversal.modelo.dto.SolicitudRecibidaDto;
import retotransversal.modelo.entities.EstadoSolicitud;
import retotransversal.modelo.entities.Solicitud;
import retotransversal.modelo.formularios.CatalogoFormularios;
import retotransversal.modelo.formularios.DatoSolicitud;
import retotransversal.modelo.formularios.FormularioDefinicion;
import retotransversal.modelo.formularios.ValidadorSolicitud;
import retotransversal.modelo.repository.SolicitudRepository;
import retotransversal.modelo.service.LimitadorSolicitudes;
import retotransversal.modelo.service.SolicitudRecibidaEvent;
import retotransversal.modelo.service.SolicitudService;

@Slf4j
@Service
public class SolicitudServiceImpl implements SolicitudService {

	private static final TypeReference<List<DatoSolicitud>> LISTA_DATOS = new TypeReference<>() {
	};

	private final CatalogoFormularios catalogo;
	private final SolicitudRepository solicitudRepository;
	private final LimitadorSolicitudes limitador;
	private final ApplicationEventPublisher eventos;
	private final ObjectMapper objectMapper;
	private final Clock reloj;

	@Autowired
	public SolicitudServiceImpl(CatalogoFormularios catalogo, SolicitudRepository solicitudRepository,
			LimitadorSolicitudes limitador, ApplicationEventPublisher eventos, ObjectMapper objectMapper) {
		this(catalogo, solicitudRepository, limitador, eventos, objectMapper, Clock.systemDefaultZone());
	}

	SolicitudServiceImpl(CatalogoFormularios catalogo, SolicitudRepository solicitudRepository,
			LimitadorSolicitudes limitador, ApplicationEventPublisher eventos, ObjectMapper objectMapper,
			Clock reloj) {
		this.catalogo = catalogo;
		this.solicitudRepository = solicitudRepository;
		this.limitador = limitador;
		this.eventos = eventos;
		this.objectMapper = objectMapper;
		this.reloj = reloj;
	}

	@Override
	public FormularioDefinicion definicion(String clave) {
		return catalogo.buscar(clave)
				.orElseThrow(() -> new RecursoNoEncontradoException("No existe el formulario " + clave));
	}

	@Override
	@Transactional
	public SolicitudRecibidaDto recibir(String clave, SolicitudPayloadDto payload, String origen) {
		FormularioDefinicion definicion = definicion(clave);
		limitador.registrar(origen);

		// Campo trampa relleno: se responde como si nada para no dar pistas, pero no se guarda.
		if (payload.getWeb() != null && !payload.getWeb().isBlank()) {
			log.info("Solicitud a {} descartada por el campo trampa", clave);
			return resguardo(definicion, ThreadLocalRandom.current().nextInt(1, 10000));
		}

		List<DatoSolicitud> datos = validar(definicion, payload);
		LocalDateTime ahora = LocalDateTime.now(reloj);
		Solicitud solicitud = solicitudRepository.save(Solicitud.builder()
				.formulario(definicion.clave())
				.asunto(definicion.organizacion() + " · " + definicion.titulo())
				.nombre(valor(datos, "nombre"))
				.email(valor(datos, "email"))
				.datos(escribir(datos))
				.estado(EstadoSolicitud.NUEVA)
				.creadaEn(ahora)
				.build());

		SolicitudRecibidaDto recibida = resguardo(definicion, solicitud.getIdSolicitud());
		solicitud.setReferencia(recibida.referencia());
		eventos.publishEvent(new SolicitudRecibidaEvent(aDto(solicitudRepository.save(solicitud))));
		return recibida;
	}

	@Override
	public List<SolicitudDto> listar() {
		return solicitudRepository.findAllByOrderByCreadaEnDesc().stream().map(this::aDto).toList();
	}

	@Override
	@Transactional
	public SolicitudDto cambiarEstado(Integer idSolicitud, EstadoSolicitud estado) {
		if (estado == null) {
			throw new IllegalArgumentException("Indica el estado de la solicitud");
		}
		Solicitud solicitud = buscar(idSolicitud);
		solicitud.setEstado(estado);
		solicitud.setAtendidaEn(estado == EstadoSolicitud.ATENDIDA ? LocalDateTime.now(reloj) : null);
		return aDto(solicitudRepository.save(solicitud));
	}

	@Override
	@Transactional
	public void borrar(Integer idSolicitud) {
		solicitudRepository.delete(buscar(idSolicitud));
	}

	private List<DatoSolicitud> validar(FormularioDefinicion definicion, SolicitudPayloadDto payload) {
		Map<String, String> errores = new LinkedHashMap<>();
		List<DatoSolicitud> datos = List.of();
		try {
			datos = ValidadorSolicitud.validar(definicion, payload.getValores(), LocalDate.now(reloj));
		} catch (DatosNoValidosException ex) {
			errores.putAll(ex.getErrores());
		}
		if (!Boolean.TRUE.equals(payload.getAceptaPrivacidad())) {
			errores.put("aceptaPrivacidad", "Necesitamos su conformidad para tratar estos datos");
		}
		if (!errores.isEmpty()) {
			throw new DatosNoValidosException(errores);
		}
		return datos;
	}

	private Solicitud buscar(Integer idSolicitud) {
		return solicitudRepository.findById(idSolicitud)
				.orElseThrow(() -> new RecursoNoEncontradoException("No existe la solicitud " + idSolicitud));
	}

	private SolicitudRecibidaDto resguardo(FormularioDefinicion definicion, int numero) {
		String referencia = "%s-%d-%04d".formatted(definicion.prefijo(), LocalDate.now(reloj).getYear(), numero);
		return new SolicitudRecibidaDto(referencia, definicion.organizacion(), definicion.confirmacion());
	}

	private static String valor(List<DatoSolicitud> datos, String clave) {
		return datos.stream().filter(dato -> dato.clave().equals(clave)).findFirst().map(DatoSolicitud::valor)
				.orElseThrow();
	}

	private String escribir(List<DatoSolicitud> datos) {
		try {
			return objectMapper.writeValueAsString(datos);
		} catch (JsonProcessingException ex) {
			throw new IllegalStateException("No se pudieron guardar los datos de la solicitud", ex);
		}
	}

	private SolicitudDto aDto(Solicitud solicitud) {
		List<DatoSolicitud> datos;
		try {
			datos = objectMapper.readValue(solicitud.getDatos(), LISTA_DATOS);
		} catch (JsonProcessingException ex) {
			throw new IllegalStateException("Datos ilegibles en la solicitud " + solicitud.getIdSolicitud(), ex);
		}
		return new SolicitudDto(solicitud.getIdSolicitud(), solicitud.getReferencia(), solicitud.getFormulario(),
				solicitud.getAsunto(), solicitud.getNombre(), solicitud.getEmail(), datos, solicitud.getEstado(),
				solicitud.getCreadaEn(), solicitud.getAtendidaEn());
	}
}
