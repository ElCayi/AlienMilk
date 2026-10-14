package retotransversal.modelo.service;

import retotransversal.modelo.dto.ExpedienteCapaDto;
import retotransversal.modelo.dto.ExpedientesDto;

public interface ExpedienteService {

	/** Todas las capas, para la ficha pública y para el editor del panel. */
	ExpedientesDto todas();

	ExpedienteCapaDto guardarGeneral(ExpedienteCapaDto capa);

	ExpedienteCapaDto guardarDeTipo(Integer idTipo, ExpedienteCapaDto capa);

	ExpedienteCapaDto guardarDeSesion(Integer idEvento, ExpedienteCapaDto capa);

	/** Al borrar una sesión o un tipo, su capa se va con él. */
	void borrarDeSesion(Integer idEvento);

	void borrarDeTipo(Integer idTipo);
}
