package retotransversal.modelo.formularios;

import java.io.IOException;
import java.io.InputStream;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Carga las definiciones de resources/formularios/*.json al arrancar y las comprueba: una definición
 * mal escrita impide arrancar el backend, en lugar de fallar delante de un visitante.
 */
@Component
public class CatalogoFormularios {

	static final String UBICACION = "classpath:formularios/*.json";

	private static final Pattern CLAVE = Pattern.compile("^[a-z0-9]+(-[a-z0-9]+)*$");
	private static final Pattern PREFIJO = Pattern.compile("^[A-Z]{2,4}$");

	private final Map<String, FormularioDefinicion> formularios;

	@Autowired
	public CatalogoFormularios(ObjectMapper objectMapper) {
		this(objectMapper, UBICACION);
	}

	CatalogoFormularios(ObjectMapper objectMapper, String ubicacion) {
		this.formularios = cargar(objectMapper, ubicacion);
	}

	public Optional<FormularioDefinicion> buscar(String clave) {
		return Optional.ofNullable(formularios.get(clave));
	}

	public Set<String> claves() {
		return formularios.keySet();
	}

	private static Map<String, FormularioDefinicion> cargar(ObjectMapper objectMapper, String ubicacion) {
		Map<String, FormularioDefinicion> cargados = new LinkedHashMap<>();
		try {
			for (Resource recurso : new PathMatchingResourcePatternResolver().getResources(ubicacion)) {
				try (InputStream entrada = recurso.getInputStream()) {
					FormularioDefinicion definicion = objectMapper.readValue(entrada, FormularioDefinicion.class);
					comprobar(definicion, recurso.getFilename());
					if (cargados.putIfAbsent(definicion.clave(), definicion) != null) {
						throw new IllegalStateException("Clave de formulario repetida: " + definicion.clave());
					}
				}
			}
		} catch (IOException ex) {
			throw new IllegalStateException("No se pudieron leer las definiciones de formularios", ex);
		}
		return Map.copyOf(cargados);
	}

	private static void comprobar(FormularioDefinicion definicion, String archivo) {
		String origen = "Formulario " + archivo + ": ";
		if (definicion.clave() == null || !CLAVE.matcher(definicion.clave()).matches()) {
			throw new IllegalStateException(origen + "la clave debe ir en minúsculas, con guiones");
		}
		if (!(definicion.clave() + ".json").equals(archivo)) {
			throw new IllegalStateException(origen + "el archivo debe llamarse como su clave");
		}
		if (vacio(definicion.titulo()) || vacio(definicion.organizacion()) || vacio(definicion.accion())
				|| vacio(definicion.confirmacion())) {
			throw new IllegalStateException(origen + "faltan el título, la organización, la acción o la confirmación");
		}
		if (definicion.prefijo() == null || !PREFIJO.matcher(definicion.prefijo()).matches()) {
			throw new IllegalStateException(origen + "el prefijo son de dos a cuatro mayúsculas");
		}
		if (definicion.campos() == null || definicion.campos().isEmpty()) {
			throw new IllegalStateException(origen + "no tiene campos");
		}

		Set<String> claves = new HashSet<>();
		for (CampoFormulario campo : definicion.campos()) {
			if (campo.clave() == null || !claves.add(campo.clave())) {
				throw new IllegalStateException(origen + "campo sin clave o repetido: " + campo.clave());
			}
			if (vacio(campo.etiqueta()) || campo.tipo() == null) {
				throw new IllegalStateException(origen + "al campo " + campo.clave() + " le falta etiqueta o tipo");
			}
			if (campo.tipo() == TipoCampo.SELECCION && (campo.opciones() == null || campo.opciones().isEmpty())) {
				throw new IllegalStateException(origen + "la selección " + campo.clave() + " no tiene opciones");
			}
			if (campo.minimo() != null && campo.maximo() != null && campo.minimo() > campo.maximo()) {
				throw new IllegalStateException(origen + "en " + campo.clave() + " el mínimo supera al máximo");
			}
		}
		exigir(definicion, "nombre", TipoCampo.TEXTO, origen);
		exigir(definicion, "email", TipoCampo.EMAIL, origen);
	}

	/** Nombre y correo van en columnas propias de la solicitud: todo formulario los pide. */
	private static void exigir(FormularioDefinicion definicion, String clave, TipoCampo tipo, String origen) {
		boolean presente = definicion.campos().stream()
				.anyMatch(campo -> campo.clave().equals(clave) && campo.tipo() == tipo && campo.requerido());
		if (!presente) {
			throw new IllegalStateException(origen + "necesita el campo obligatorio «" + clave + "» de tipo " + tipo);
		}
	}

	private static boolean vacio(String valor) {
		return valor == null || valor.isBlank();
	}
}
