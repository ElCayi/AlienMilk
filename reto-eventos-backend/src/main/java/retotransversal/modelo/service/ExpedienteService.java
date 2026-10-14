package retotransversal.modelo.service;

import java.util.Map;

import retotransversal.modelo.dto.ExpedienteCapaDto;

/**
 * El expediente de cada sesión: el contenido de su ficha pública. Cada sesión tiene el suyo completo;
 * para cambiar muchas a la vez está el guardado en lote (el panel de edición en lote de /admin).
 */
public interface ExpedienteService {

	/** El expediente de una sesión (vacío si no tiene). */
	ExpedienteCapaDto deSesion(Integer idEvento);

	/** Todos, por id de sesión: para el panel de edición en lote. */
	Map<Integer, ExpedienteCapaDto> todos();

	ExpedienteCapaDto guardarDeSesion(Integer idEvento, ExpedienteCapaDto expediente);

	/** Guarda varios a la vez: o todos o ninguno, y los errores de todos de una vez. */
	Map<Integer, ExpedienteCapaDto> guardarLote(Map<Integer, ExpedienteCapaDto> expedientes);

	/** Al borrar una sesión, su expediente se va con ella. */
	void borrarDeSesion(Integer idEvento);

	/**
	 * Reparte en cada sesión lo que aún quede en las capas antiguas (común y por tipo) y las borra.
	 * Devuelve cuántas sesiones ha completado; si no queda nada que repartir, no hace nada.
	 */
	int aplanarCapasAntiguas();
}
