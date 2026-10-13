package retotransversal.modelo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import retotransversal.modelo.entities.Perfil;

@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
public class PerfilDto {

	private Integer idPerfil;
	private String nombre;
	/** Cuentas con este perfil. */
	private long usuarios;
	/** Perfil del sistema (administrador o cliente): no se renombra ni se borra. */
	private boolean sistema;

	public static PerfilDto fromEntity(Perfil perfil, long usuarios, boolean sistema) {
		return PerfilDto.builder()
				.idPerfil(perfil.getIdPerfil())
				.nombre(perfil.getNombre())
				.usuarios(usuarios)
				.sistema(sistema)
				.build();
	}
}
