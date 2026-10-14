package retotransversal.modelo.service.impl;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.function.Predicate;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import retotransversal.exception.RecursoNoEncontradoException;
import retotransversal.modelo.dto.ExpedienteCapaDto;
import retotransversal.modelo.dto.ExpedienteCapaDto.Campo;
import retotransversal.modelo.dto.ExpedienteCapaDto.Colaborador;
import retotransversal.modelo.dto.ExpedienteCapaDto.Paso;
import retotransversal.modelo.dto.ExpedienteCapaDto.Pregunta;
import retotransversal.modelo.dto.ExpedientesDto;
import retotransversal.modelo.entities.Expediente;
import retotransversal.modelo.entities.TipoEvento;
import retotransversal.modelo.repository.EventoRepository;
import retotransversal.modelo.repository.ExpedienteRepository;
import retotransversal.modelo.repository.TipoEventoRepository;
import retotransversal.modelo.service.ErroresCampos;
import retotransversal.modelo.service.ExpedienteService;

/**
 * El expediente de las sesiones, en tres capas (ver Expediente). Antes de guardar una capa se limpia:
 * textos sin espacios sobrantes, filas vacías fuera; una capa que se queda sin nada se borra, y su
 * ámbito vuelve a heredarlo todo.
 */
@Service
@RequiredArgsConstructor
public class ExpedienteServiceImpl implements ExpedienteService {

	/** Filas como mucho en cada apartado con lista. */
	static final int FILAS_MAXIMAS = 30;

	private static final ObjectMapper JSON = new ObjectMapper()
			.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

	private final ExpedienteRepository expedienteRepository;
	private final TipoEventoRepository tipoEventoRepository;
	private final EventoRepository eventoRepository;

	@Override
	public ExpedientesDto todas() {
		Map<String, String> nombresTipo = new LinkedHashMap<>();
		for (TipoEvento tipo : tipoEventoRepository.findAll()) {
			nombresTipo.put(Expediente.deTipo(tipo.getIdTipo()), tipo.getNombre());
		}

		ExpedienteCapaDto general = ExpedienteCapaDto.VACIA;
		Map<String, ExpedienteCapaDto> porTipo = new LinkedHashMap<>();
		Map<String, ExpedienteCapaDto> porSesion = new LinkedHashMap<>();
		for (Expediente expediente : expedienteRepository.findAll()) {
			String clave = expediente.getClave();
			ExpedienteCapaDto capa = leer(expediente.getContenido());
			if (Expediente.GENERAL.equals(clave)) {
				general = capa;
			} else if (nombresTipo.containsKey(clave)) {
				porTipo.put(nombresTipo.get(clave), capa);
			} else if (clave.startsWith("SESION:")) {
				porSesion.put(clave.substring("SESION:".length()), capa);
			}
		}
		return new ExpedientesDto(general, porTipo, porSesion);
	}

	@Override
	@Transactional
	public ExpedienteCapaDto guardarGeneral(ExpedienteCapaDto capa) {
		return guardar(Expediente.GENERAL, capa);
	}

	@Override
	@Transactional
	public ExpedienteCapaDto guardarDeTipo(Integer idTipo, ExpedienteCapaDto capa) {
		if (!tipoEventoRepository.existsById(idTipo)) {
			throw new RecursoNoEncontradoException("Tipo de evento no encontrado");
		}
		return guardar(Expediente.deTipo(idTipo), capa);
	}

	@Override
	@Transactional
	public ExpedienteCapaDto guardarDeSesion(Integer idEvento, ExpedienteCapaDto capa) {
		if (!eventoRepository.existsById(idEvento)) {
			throw new RecursoNoEncontradoException("Evento no encontrado");
		}
		return guardar(Expediente.deSesion(idEvento), capa);
	}

	@Override
	public void borrarDeSesion(Integer idEvento) {
		expedienteRepository.deleteById(Expediente.deSesion(idEvento));
	}

	@Override
	public void borrarDeTipo(Integer idTipo) {
		expedienteRepository.deleteById(Expediente.deTipo(idTipo));
	}

	private ExpedienteCapaDto guardar(String clave, ExpedienteCapaDto entrada) {
		ExpedienteCapaDto capa = limpiar(entrada == null ? ExpedienteCapaDto.VACIA : entrada);
		if (capa.equals(ExpedienteCapaDto.VACIA)) {
			expedienteRepository.deleteById(clave);
		} else {
			expedienteRepository.save(new Expediente(clave, escribir(capa)));
		}
		return capa;
	}

	/** Limpia la capa y, si algo no cabe o falta, lanza todos los errores a la vez, por apartado. */
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
