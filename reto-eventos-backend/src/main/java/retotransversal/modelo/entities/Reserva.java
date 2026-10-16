package retotransversal.modelo.entities;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
@Entity
@Table(name = "reservas")
public class Reserva {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "id_reserva")
	private Integer idReserva;

	@ManyToOne(fetch = FetchType.EAGER)
	@JoinColumn(name = "id_evento", nullable = false)
	private Evento evento;

	@ManyToOne(fetch = FetchType.EAGER)
	@JoinColumn(name = "username", nullable = false)
	private Usuario usuario;

	@Column(name = "precio_venta", nullable = false, precision = 9, scale = 2)
	private BigDecimal precioVenta;

	@Column(length = 200)
	private String observaciones;

	@Column(nullable = false)
	private Integer cantidad;

	/**
	 * Los participantes, uno por plaza, en su orden. Vacía en las reservas anteriores al registro de
	 * asistencia y en las que se dan de alta a mano desde el panel: «participantes sin registrar».
	 */
	@Builder.Default
	@OneToMany(mappedBy = "reserva", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
	@OrderBy("orden")
	@ToString.Exclude
	@EqualsAndHashCode.Exclude
	private List<Asistente> asistentes = new ArrayList<>();

	/** Para los avisos del mismo día (suspensiones por condiciones de la estación). */
	@Column(length = 20)
	private String telefono;

	/** Las adaptaciones de participación que se piden, si alguna. */
	@Column(length = 500)
	private String adaptaciones;

	/** Si se prevé introducir material o equipamiento externo; entonces, cuál. */
	@Builder.Default
	@Column(name = "material_externo", nullable = false)
	private boolean materialExterno = false;

	@Column(name = "material_descripcion", length = 500)
	private String materialDescripcion;

	/** Cuándo se confirmaron la edad mínima y las condiciones de acceso. */
	@Column(name = "conformidad_en")
	private LocalDateTime conformidadEn;

	/** Con adaptaciones o material externo, alguien de AlienMilk tiene que evaluarla antes de la sesión. */
	public boolean requiereRevision() {
		return (adaptaciones != null && !adaptaciones.isBlank()) || materialExterno;
	}
}
