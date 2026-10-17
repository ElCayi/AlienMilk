package retotransversal.modelo.entities;

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
 * Un participante de una reserva: una plaza, un nombre. En el control de ingreso se coteja su nombre de
 * identificación con la credencial que dijo que presentaría. Sus incompatibilidades las evalúa AlienMilk
 * conforme al protocolo de la sesión.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "asistentes")
public class Asistente {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "id_asistente")
	private Integer idAsistente;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "id_reserva", nullable = false)
	private Reserva reserva;

	/** Su lugar en la reserva: 1, 2, 3... */
	@Column(nullable = false)
	private Integer orden;

	@Column(nullable = false, length = 80)
	private String nombre;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 30)
	private Credencial credencial;

	@Column(length = 80)
	private String procedencia;

	@Column(length = 300)
	private String incompatibilidades;

	/** Cuándo pasó el control de ingreso; null si aún no ha entrado. Ausente es quien no entró y la sesión acabó. */
	@Column(name = "entrada_en")
	private LocalDateTime entradaEn;
}
