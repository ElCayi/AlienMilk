package retotransversal.modelo.service;

import retotransversal.modelo.entities.Perfil;

public interface PerfilService extends CrudGenerico<Perfil, Integer> {

	Perfil findByNombre(String nombre);

	/** Cuentas con ese perfil: con alguna, el perfil no se puede borrar. */
	long usuariosCon(Integer idPerfil);

	/** ROLE_ADMON y ROLE_CLIENTE: los que dan acceso, que no se renombran ni se borran. */
	boolean esDelSistema(Perfil perfil);
}
