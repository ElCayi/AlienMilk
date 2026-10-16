package retotransversal.modelo.service;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import retotransversal.modelo.dto.ExpedienteCapaDto;
import retotransversal.modelo.dto.ExpedienteCapaDto.Campo;
import retotransversal.modelo.entities.EstadoEvento;
import retotransversal.modelo.entities.Evento;
import retotransversal.modelo.repository.EventoRepository;
import retotransversal.modelo.repository.TipoEventoRepository;
import retotransversal.modelo.service.impl.EventoServiceImpl;

/**
 * El botón «Añadir sesiones demo» del panel: suma al programa unas cuantas sesiones de ejemplo, con su
 * expediente, sin tocar lo que ya hay. Salen de {@code fabrica/sesiones-demo.json}; primero las que aún
 * no están en el programa y, cuando ya están todas, otra convocatoria de cada una («· II», «· III»...).
 * Van una por semana a partir de la última sesión activa. Lo que una plantilla no declara en su
 * expediente (equipo, preguntas, colaboradores...) lo toma del bloque «comun» del catálogo.
 */
@Service
public class SesionesDemoService {

	/** Cuántas sesiones añade cada pulsación. */
	static final int POR_VEZ = 3;

	/** Días entre una sesión añadida y la siguiente. */
	static final int DIAS_ENTRE_SESIONES = 7;

	private static final ObjectMapper JSON = new ObjectMapper().registerModule(new JavaTimeModule())
			.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

	private static final String[] ROMANOS = { "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X" };

	private final EventoRepository eventoRepository;
	private final TipoEventoRepository tipoEventoRepository;
	private final EventoService eventoService;
	private final ExpedienteService expedienteService;
	private final List<Plantilla> plantillas;
	private final Clock reloj;

	@Autowired
	public SesionesDemoService(EventoRepository eventoRepository, TipoEventoRepository tipoEventoRepository,
			EventoService eventoService, ExpedienteService expedienteService) {
		this(eventoRepository, tipoEventoRepository, eventoService, expedienteService, leerPlantillas(),
				Clock.system(EventoServiceImpl.ZONA));
	}

	SesionesDemoService(EventoRepository eventoRepository, TipoEventoRepository tipoEventoRepository,
			EventoService eventoService, ExpedienteService expedienteService, List<Plantilla> plantillas, Clock reloj) {
		this.eventoRepository = eventoRepository;
		this.tipoEventoRepository = tipoEventoRepository;
		this.eventoService = eventoService;
		this.expedienteService = expedienteService;
		this.plantillas = plantillas;
		this.reloj = reloj;
	}

	/** Añade {@link #POR_VEZ} sesiones de ejemplo y devuelve las creadas. Todo o nada. */
	@Transactional
	public List<Evento> anadir() {
		List<Evento> existentes = eventoRepository.findAll();
		LocalDate fecha = existentes.stream()
				.filter(evento -> evento.getEstado() == EstadoEvento.ACTIVO)
				.map(Evento::getFechaInicio)
				.max(Comparator.naturalOrder())
				.filter(ultima -> ultima.isAfter(LocalDate.now(reloj)))
				.orElse(LocalDate.now(reloj));

		// Las menos usadas primero; a igualdad, en el orden del catálogo.
		List<Plantilla> elegidas = plantillas.stream()
				.sorted(Comparator.comparingLong(plantilla -> convocatorias(plantilla, existentes)))
				.limit(POR_VEZ)
				.toList();

		List<Evento> creadas = new ArrayList<>();
		for (Plantilla plantilla : elegidas) {
			fecha = fecha.plusDays(DIAS_ENTRE_SESIONES);
			long anteriores = convocatorias(plantilla, existentes);
			Evento evento = eventoService.insertOne(Evento.builder()
					.nombre(anteriores == 0 ? plantilla.nombre() : plantilla.nombre() + " · " + romano(anteriores + 1))
					.descripcion(plantilla.descripcion())
					.fechaInicio(fecha)
					.horaInicio(plantilla.horaInicio())
					.duracion(plantilla.duracion())
					.direccion(plantilla.direccion())
					.aforoMaximo(plantilla.aforoMaximo())
					.minimoAsistencia(plantilla.minimoAsistencia())
					.precio(plantilla.precio())
					.tipoEvento(tipoEventoRepository.findByNombre(plantilla.tipo()).orElse(null))
					.build());
			expedienteService.guardarDeSesion(evento.getIdEvento(), plantilla.expediente());
			creadas.add(evento);
		}
		return creadas;
	}

	/** Cuántas veces está ya en el programa: con su nombre tal cual o con un número de convocatoria. */
	private static long convocatorias(Plantilla plantilla, List<Evento> existentes) {
		return existentes.stream()
				.map(Evento::getNombre)
				.filter(nombre -> nombre.equals(plantilla.nombre()) || nombre.startsWith(plantilla.nombre() + " · "))
				.count();
	}

	private static String romano(long numero) {
		return numero <= ROMANOS.length ? ROMANOS[(int) numero - 1] : String.valueOf(numero);
	}

	private static List<Plantilla> leerPlantillas() {
		try (InputStream entrada = new ClassPathResource("fabrica/sesiones-demo.json").getInputStream()) {
			Catalogo catalogo = JSON.readValue(entrada, Catalogo.class);
			return catalogo.plantillas().stream()
					.map(plantilla -> plantilla.conExpediente(completar(plantilla.expediente(), catalogo.comun())))
					.toList();
		} catch (IOException e) {
			throw new UncheckedIOException("No se ha podido leer fabrica/sesiones-demo.json", e);
		}
	}

	/**
	 * El expediente propio, con lo que le falte tomado del común. Las condiciones de acceso se suman: primero
	 * las comunes (salvo las que la plantilla ya declara con la misma etiqueta), luego las suyas.
	 */
	static ExpedienteCapaDto completar(ExpedienteCapaDto propio, ExpedienteCapaDto comun) {
		Set<String> propias = propio.acceso() == null ? Set.of()
				: propio.acceso().stream().map(Campo::etiqueta).collect(Collectors.toSet());
		List<Campo> acceso = Stream.concat(
				comun.acceso() == null ? Stream.empty() : comun.acceso().stream().filter(c -> !propias.contains(c.etiqueta())),
				propio.acceso() == null ? Stream.empty() : propio.acceso().stream()).toList();
		return new ExpedienteCapaDto(
				o(propio.entradilla(), comun.entradilla()),
				o(propio.texto(), comun.texto()),
				o(propio.procedencia(), comun.procedencia()),
				o(propio.notasCata(), comun.notasCata()),
				o(propio.programa(), comun.programa()),
				o(propio.equipo(), comun.equipo()),
				acceso.isEmpty() ? null : acceso,
				o(propio.recomendaciones(), comun.recomendaciones()),
				o(propio.preguntas(), comun.preguntas()),
				o(propio.colaboradores(), comun.colaboradores()),
				o(propio.creditos(), comun.creditos()));
	}

	private static <T> T o(T propio, T comun) {
		return propio != null ? propio : comun;
	}

	/** El archivo entero: lo común a todas y las plantillas. */
	record Catalogo(ExpedienteCapaDto comun, List<Plantilla> plantillas) {
	}

	/** Una sesión de ejemplo del catálogo: sus datos, salvo la fecha, y su expediente. */
	record Plantilla(String nombre, String descripcion, String tipo, LocalTime horaInicio, Integer duracion,
			String direccion, Integer aforoMaximo, Integer minimoAsistencia, BigDecimal precio,
			ExpedienteCapaDto expediente) {

		Plantilla conExpediente(ExpedienteCapaDto completo) {
			return new Plantilla(nombre, descripcion, tipo, horaInicio, duracion, direccion, aforoMaximo,
					minimoAsistencia, precio, completo);
		}
	}
}
