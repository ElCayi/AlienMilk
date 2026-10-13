package retotransversal.modelo.service;

import java.util.List;

import retotransversal.modelo.entities.Usuario;

public interface UsuarioService extends CrudGenerico<Usuario, String> {

	List<Usuario> findByPerfilNombre(String nombrePerfil);

	/** La persona borra su propia cuenta desde Mi panel, confirmando con su contraseña. */
	void eliminarCuentaPropia(String username, String password);
}
