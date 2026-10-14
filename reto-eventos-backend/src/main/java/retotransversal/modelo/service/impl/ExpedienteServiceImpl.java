package retotransversal.modelo.service.impl;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.function.Function;
import java.util.function.Predicate;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import retotransversal.exception.DatosNoValidosException;
import retotransversal.exception.RecursoNoEncontradoException;
import retotransversal.modelo.dto.ExpedienteCapaDto;
import retotransversal.modelo.dto.ExpedienteCapaDto.Campo;
import retotransversal.modelo.dto.ExpedienteCapaDto.Colaborador;
import retotransversal.modelo.dto.ExpedienteCapaDto.Paso;
import retotransversal.modelo.dto.ExpedienteCapaDto.Pregunta;
import retotransversal.modelo.entities.Evento;
import retotransversal.modelo.entities.Expediente;
import retotransversal.modelo.repository.EventoRepository;
import retotransversal.modelo.repository.ExpedienteRepository;
import retotransversal.modelo.service.ErroresCampos;
import retotransversal.modelo.service.ExpedienteService;

/**
 * El expediente de cada sesión. Antes de guardarlo se limpia: textos sin espacios sobrantes, filas
 * vacías fuera; uno que se queda sin nada se borra.
 */
@Service
@RequiredArgsConstructor
public class ExpedienteServiceImpl implements ExpedienteService {

	/** Filas como mucho en cada apartado con lista. */
	static final int FILAS_MAXIMAS = 30;

	private static final ObjectMapper JSON = new ObjectMapper()
			.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

	private final ExpedienteRepository expedienteRepository;
	private final EventoRepository eventoRepository;

	@Override
	public ExpedienteCapaDto deSesion(Integer idEvento) {
		if (!eventoRepository.existsById(idEvento)) {
			throw new RecursoNoEncontradoException("Evento no encontrado");
		}
		return expedienteRepository.findById(Expediente.deSesion(idEvento))
				.map(expediente -> leer(expediente.getContenido()))
				.orElse(ExpedienteCapaDto.VACIA);
	}

	@Override
	public Map<Integer, ExpedienteCapaDto> todos() {
		Map<Integer, ExpedienteCapaDto> todos = new TreeMap<>();
		for (Expediente expediente : expedienteRepository.findAll()) {
			if (expediente.getClave().startsWith(Expediente.PREFIJO_SESION)) {
				todos.put(Integer.valueOf(expediente.getClave().substring(Expediente.PREFIJO_SESION.length())),
						leer(expediente.getContenido()));
			}
		}
		return todos;
	}

	@Override
	@Transactional
	public ExpedienteCapaDto guardarDeSesion(Integer idEvento, ExpedienteCapaDto expediente) {
		if (!eventoRepository.existsById(idEvento)) {
			throw new RecursoNoEncontradoException("Evento no encontrado");
		}
		ExpedienteCapaDto limpio = limpiar(expediente == null ? ExpedienteCapaDto.VACIA : expediente);
		guardar(idEvento, limpio);
		return limpio;
	}

	/**
	 * Primero se limpian y validan todos; si alguno falla, no se guarda ninguno y los errores llegan
	 * juntos, cada uno con la sesión delante: {@code "7.preguntas"}.
	 */
	@Override
	@Transactional
	public Map<Integer, ExpedienteCapaDto> guardarLote(Map<Integer, ExpedienteCapaDto> expedientes) {
		Map<Integer, ExpedienteCapaDto> limpios = new LinkedHashMap<>();
		Map<String, String> errores = new LinkedHashMap<>();
		for (Map.Entry<Integer, ExpedienteCapaDto> entrada : expedientes.entrySet()) {
			Integer idEvento = entrada.getKey();
			if (!eventoRepository.existsById(idEvento)) {
				errores.put(idEvento + ".sesion", "Esta sesión ya no existe");
				continue;
			}
			try {
				limpios.put(idEvento, limpiar(entrada.getValue() == null ? ExpedienteCapaDto.VACIA : entrada.getValue()));
			} catch (DatosNoValidosException e) {
				e.getErrores().forEach((apartado, mensaje) -> errores.put(idEvento + "." + apartado, mensaje));
			}
		}
		if (!errores.isEmpty()) {
			throw new DatosNoValidosException(errores);
		}
		limpios.forEach(this::guardar);
		return limpios;
	}

	@Override
	public void borrarDeSesion(Integer idEvento) {
		expedienteRepository.deleteById(Expediente.deSesion(idEvento));
	}

	/**
	 * Cada sesión se queda con lo que enseñaba su ficha: lo común, encima lo de su tipo y encima lo
	 * suyo; acceso y preguntas, sumados. Después se borran las capas común y de tipo.
	 */
	@Override
	@Transactional
	public int aplanarCapasAntiguas() {
		Map<String, ExpedienteCapaDto> capas = new LinkedHashMap<>();
		for (Expediente expediente : expedienteRepository.findAll()) {
			capas.put(expediente.getClave(), leer(expediente.getContenido()));
		}
		List<String> antiguas = capas.keySet().stream()
				.filter(clave -> clave.equals(Expediente.GENERAL) || clave.startsWith(Expediente.PREFIJO_TIPO))
				.toList();
		if (antiguas.isEmpty()) {
			return 0;
		}
		ExpedienteCapaDto general = capas.get(Expediente.GENERAL);
		int completadas = 0;
		for (Evento evento : eventoRepository.findAll()) {
			ExpedienteCapaDto deTipo = capas.get(Expediente.PREFIJO_TIPO + evento.getTipoEvento().getIdTipo());
			ExpedienteCapaDto propio = capas.get(Expediente.deSesion(evento.getIdEvento()));
			ExpedienteCapaDto completo = superponer(superponer(general, deTipo), propio);
			if (completo != null && !completo.equals(ExpedienteCapaDto.VACIA)) {
				guardar(evento.getIdEvento(), completo);
				completadas++;
			}
		}
		expedienteRepository.deleteAllById(antiguas);
		return completadas;
	}

	private void guardar(Integer idEvento, ExpedienteCapaDto expediente) {
		String clave = Expediente.deSesion(idEvento);
		if (expediente.equals(ExpedienteCapaDto.VACIA)) {
			expedienteRepository.deleteById(clave);
		} else {
			expedienteRepository.save(new Expediente(clave, escribir(expediente)));
		}
	}

	/** Lo que declara `encima` sustituye a lo de `base`, salvo acceso y preguntas, que se suman. */
	static ExpedienteCapaDto superponer(ExpedienteCapaDto base, ExpedienteCapaDto encima) {
		if (base == null) {
			return encima;
		}
		if (encima == null) {
			return base;
		}
		return new ExpedienteCapaDto(
				elegir(encima.entradilla(), base.entradilla()),
				elegir(encima.texto(), base.texto()),
				elegir(encima.procedencia(), base.procedencia()),
				elegir(encima.horario(), base.horario()),
				elegir(encima.notasCata(), base.notasCata()),
				elegir(encima.programa(), base.programa()),
				elegir(encima.equipo(), base.equipo()),
				sumar(base.acceso(), encima.acceso()),
				elegir(encima.recomendaciones(), base.recomendaciones()),
				sumar(base.preguntas(), encima.preguntas()),
				elegir(encima.colaboradores(), base.colaboradores()),
				elegir(encima.creditos(), base.creditos()));
	}

	private static <T> T elegir(T encima, T base) {
		return encima != null ? encima : base;
	}

	private static <T> List<T> sumar(List<T> base, List<T> encima) {
		if (base == null) {
			return encima;
		}
		if (encima == null) {
			return base;
		}
		// Sin repetir: si una capa antigua vuelve a aparecer (otra pasada de la migración), lo que la
		// sesión ya tiene no se duplica.
		List<T> suma = new ArrayList<>(base);
		encima.stream().filter(fila -> !suma.contains(fila)).forEach(suma::add);
		return List.copyOf(suma);
	}

	/** Limpia el expediente y, si algo no cabe o falta, lanza todos los errores a la vez, por apartado. */
	static ExpedienteCapaDto limpiar(ExpedienteCapaDto capa) {
		ErroresCampos errores = new ErroresCampos()
				.maximo("entradilla", capa.entradilla(), 600)
				.maximo("procedencia", capa.procedencia(), 200)
				.maximo("horario", capa.horario(), 200)
				.maximo("creditos", capa.creditos(), 600);

		ExpedienteCapaDto limpia = new ExpedienteCapaDto(
				ErroresCampos.limpio(capa.entradilla()),
				filas(errores, "texto", capa.texto(), ErroresCampos::limpio, ok -> ok.length() <= 2000,
						"Cada párrafo, como máximo 2000 caracteres"),
				ErroresCampos.limpio(capa.procedencia()),
				ErroresCampos.limpio(capa.horario()),
				campos(errores, "notasCata", capa.notasCata()),
				filas(errores, "programa", capa.programa(),
						paso -> vacioANull(new Paso(ErroresCampos.limpio(paso.hora()), ErroresCampos.limpio(paso.titulo()),
								ErroresCampos.limpio(paso.detalle()))),
						paso -> paso.hora() != null && paso.titulo() != null && cabe(paso.hora(), 20)
								&& cabe(paso.titulo(), 120) && cabe(paso.detalle(), 600),
						"Cada paso necesita hora (hasta 20 caracteres) y título (hasta 120)"),
				campos(errores, "equipo", capa.equipo()),
				campos(errores, "acceso", capa.acceso()),
				filas(errores, "recomendaciones", capa.recomendaciones(), ErroresCampos::limpio, ok -> ok.length() <= 300,
						"Cada recomendación, como máximo 300 caracteres"),
				filas(errores, "preguntas", capa.preguntas(),
						p -> vacioANull(new Pregunta(ErroresCampos.limpio(p.pregunta()), ErroresCampos.limpio(p.respuesta()))),
						p -> p.pregunta() != null && p.respuesta() != null && cabe(p.pregunta(), 300)
								&& cabe(p.respuesta(), 1500),
						"Cada pregunta necesita su respuesta (hasta 300 y 1500 caracteres)"),
				filas(errores, "colaboradores", capa.colaboradores(),
						c -> vacioANull(new Colaborador(ErroresCampos.limpio(c.rol()), ErroresCampos.limpio(c.nombre()),
								ErroresCampos.limpio(c.detalle()))),
						c -> c.rol() != null && c.nombre() != null && cabe(c.rol(), 80) && cabe(c.nombre(), 120)
								&& cabe(c.detalle(), 600),
						"Cada colaborador necesita papel (hasta 80 caracteres) y nombre (hasta 120)"),
				ErroresCampos.limpio(capa.creditos()));
		errores.lanzarSiHay();
		return limpia;
	}

	private static List<Campo> campos(ErroresCampos errores, String apartado, List<Campo> lista) {
		return filas(errores, apartado, lista,
				c -> vacioANull(new Campo(ErroresCampos.limpio(c.etiqueta()), ErroresCampos.limpio(c.valor()))),
				c -> c.etiqueta() != null && c.valor() != null && cabe(c.etiqueta(), 60) && cabe(c.valor(), 600),
				"Cada fila necesita etiqueta (hasta 60 caracteres) y valor (hasta 600)");
	}

	/**
	 * Limpia cada fila de una lista y quita las que se quedan vacías (null). Una lista que no llega
	 * sigue sin llegar: el apartado se hereda.
	 */
	private static <T> List<T> filas(ErroresCampos errores, String apartado, List<T> lista, Function<T, T> limpiar,
			Predicate<T> valida, String siNo) {
		if (lista == null) {
			return null;
		}
		List<T> limpias = new ArrayList<>();
		for (T fila : lista) {
			T limpia = fila == null ? null : limpiar.apply(fila);
			if (limpia != null) {
				limpias.add(limpia);
			}
		}
		errores.si(limpias.stream().anyMatch(valida.negate()), apartado, siNo)
				.si(limpias.size() > FILAS_MAXIMAS, apartado, "Como máximo %d filas".formatted(FILAS_MAXIMAS));
		return List.copyOf(limpias);
	}

	private static boolean cabe(String texto, int maximo) {
		return texto == null || texto.length() <= maximo;
	}

	/** Una fila con todos sus datos en blanco no es una fila. */
	private static <T extends Record> T vacioANull(T fila) {
		for (var componente : fila.getClass().getRecordComponents()) {
			try {
				if (componente.getAccessor().invoke(fila) != null) {
					return fila;
				}
			} catch (ReflectiveOperationException e) {
				throw new IllegalStateException(e);
			}
		}
		return null;
	}

	private static ExpedienteCapaDto leer(String contenido) {
		try {
			return JSON.readValue(contenido, ExpedienteCapaDto.class);
		} catch (JsonProcessingException e) {
			throw new IllegalStateException("Expediente ilegible en la base de datos", e);
		}
	}

	private static String escribir(ExpedienteCapaDto capa) {
		try {
			return JSON.writeValueAsString(capa);
		} catch (JsonProcessingException e) {
			throw new IllegalStateException(e);
		}
	}
}
