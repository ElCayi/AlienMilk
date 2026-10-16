package retotransversal.modelo.service;

import java.util.List;

import retotransversal.modelo.entities.Usuario;

public interface UsuarioService extends CrudGenerico<Usuario, String> {

	List<Usuario> findByPerfilNombre(String nombrePerfil);

	/** La persona borra su propia cuenta desde Mi panel, confirmando con su contraseña. */
	void eliminarCuentaPropia(String username, String password);

	/** Quien ha entrado cambia el nombre con el que se le saluda (como mucho 30 caracteres). */
	Usuario cambiarNombrePropio(String username, String nombre);

	/** Quien ha entrado se apunta al programa de AlienMilk Sessions o se da de baja. */
	Usuario cambiarComunicacionesPropias(String username, boolean acepta);
}
