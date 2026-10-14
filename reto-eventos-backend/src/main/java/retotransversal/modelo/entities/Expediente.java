package retotransversal.modelo.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * El expediente de una sesión, el contenido editorial de su ficha pública (texto, notas de cata,
 * programa, acceso, equipo, preguntas...), con clave {@code SESION:<idEvento>}. El contenido es el
 * JSON de {@code ExpedienteCapaDto}.
 *
 * Hasta el 2026-10-15 había además dos capas que se heredaban, {@code GENERAL} y {@code TIPO:<idTipo>};
 * al arrancar se reparten en cada sesión y se borran (ExpedienteService.aplanarCapasAntiguas).
 */
@AllArgsConstructor
@NoArgsConstructor
@Data
@Entity
@Table(name = "expedientes")
public class Expediente {

	public static final String GENERAL = "GENERAL";
	public static final String PREFIJO_TIPO = "TIPO:";
	public static final String PREFIJO_SESION = "SESION:";

	@Id
	@Column(length = 20)
	private String clave;

	@Column(nullable = false, columnDefinition = "LONGTEXT")
	private String contenido;

	public static String deSesion(Integer idEvento) {
		return PREFIJO_SESION + idEvento;
	}
}
