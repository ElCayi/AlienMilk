package retotransversal.modelo.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Una capa del expediente de las sesiones, el contenido editorial de la ficha pública (texto, notas
 * de cata, programa, acceso, equipo, preguntas...). Hay tres ámbitos, que se superponen en este orden:
 * la capa general ({@code GENERAL}), la de cada tipo ({@code TIPO:<idTipo>}) y la de cada sesión
 * ({@code SESION:<idEvento>}). El contenido es el JSON de {@code ExpedienteCapaDto}.
 */
@AllArgsConstructor
@NoArgsConstructor
@Data
@Entity
@Table(name = "expedientes")
public class Expediente {

	public static final String GENERAL = "GENERAL";

	@Id
	@Column(length = 20)
	private String clave;

	@Column(nullable = false, columnDefinition = "LONGTEXT")
	private String contenido;

	public static String deTipo(Integer idTipo) {
		return "TIPO:" + idTipo;
	}

	public static String deSesion(Integer idEvento) {
		return "SESION:" + idEvento;
	}
}
