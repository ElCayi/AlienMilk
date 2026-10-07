package retotransversal.modelo.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Distinción concedida a AlienMilk, en la franja de la red de confianza de la portada. La fecha es
 * texto: un año o una fórmula como «Renovada desde 1962».
 */
@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
@Entity
@Table(name = "premio")
public class Premio {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "id_premio")
	private Integer idPremio;

	@Column(nullable = false, length = 12)
	private String sigla;

	@Column(nullable = false, unique = true, length = 80)
	private String nombre;

	@Column(nullable = false, length = 100)
	private String otorgante;

	@Column(nullable = false, length = 30)
	private String fecha;

	@Column(nullable = false)
	private Integer orden;

	@Column(nullable = false)
	private Boolean activo;
}
