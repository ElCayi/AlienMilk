package retotransversal.modelo.service;

import retotransversal.modelo.entities.TipoEvento;

public interface TipoEventoService extends CrudGenerico<TipoEvento, Integer> {

	/** Sesiones de ese tipo: con alguna, el tipo no se puede borrar. */
	long sesionesDe(Integer idTipo);
}
