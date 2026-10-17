package retotransversal.modelo.entities;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Una devolución de una reserva, con su propio registro: cuánto, por qué medio, por qué, y si ya se hizo.
 * Con tarjeta se hace al momento por Stripe (y guarda su referencia); en taquilla queda pendiente hasta
 * que alguien la entrega y lo marca, para que nada cuente como devuelto sin haberlo devuelto.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "devoluciones")
public class Devolucion {

	public enum Medio {
		TARJETA,
		TAQUILLA
	}

	public enum Estado {
		PENDIENTE,
		HECHA
	}

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "id_devolucion")
	private Integer idDevolucion;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "id_reserva", nullable = false)
	private Reserva reserva;

	@Column(nullable = false, precision = 9, scale = 2)
	private BigDecimal importe;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 10)
	private Medio medio;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 10)
	private Estado estado;

	/** Por qué: «Cancelación del cliente», «Menos plazas»… */
	@Column(nullable = false, length = 120)
	private String motivo;

	/** La devolución en Stripe (re_…); null en taquilla o si la web no tiene el pago activado. */
	@Column(length = 100)
	private String referencia;

	@Column(name = "creada_en", nullable = false)
	private LocalDateTime creadaEn;

	@Column(name = "hecha_en")
	private LocalDateTime hechaEn;
}
