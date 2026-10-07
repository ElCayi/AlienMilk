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
 * Socio de la red de confianza, en la cinta de marcas de la portada. El estilo es el rótulo de su
 * marca (serif, condensed, wide o italic) y el emblema, una clave del catálogo del frontend.
 */
@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
@Entity
@Table(name = "socio")
public class Socio {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "id_socio")
	private Integer idSocio;

	@Column(nullable = false, unique = true, length = 80)
	private String nombre;

	@Column(nullable = false, length = 12)
	private String estilo;

	@Column(nullable = false, length = 30)
	private String emblema;

	@Column(nullable = false)
	private Integer orden;

	@Column(nullable = false)
	private Boolean activo;
}
