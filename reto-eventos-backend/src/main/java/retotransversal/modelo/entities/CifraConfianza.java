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
 * Cifra de la red de confianza de la portada. Si lleva cálculo, el valor guardado es su base: con
 * {@link #CALCULO_ANIOS_DESDE}, un año, y se muestran los años transcurridos desde entonces.
 */
@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
@Entity
@Table(name = "cifra_confianza")
public class CifraConfianza {

	public static final String CALCULO_ANIOS_DESDE = "ANIOS_DESDE";

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "id_cifra")
	private Integer idCifra;

	@Column(nullable = false, unique = true, length = 40)
	private String clave;

	@Column(nullable = false, length = 40)
	private String rotulo;

	@Column(nullable = false, length = 20)
	private String valor;

	@Column(length = 20)
	private String unidad;

	@Column(length = 80)
	private String nota;

	@Column(length = 20)
	private String calculo;

	@Column(nullable = false)
	private Integer orden;
}
