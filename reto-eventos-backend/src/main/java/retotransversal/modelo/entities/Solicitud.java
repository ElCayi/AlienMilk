package retotransversal.modelo.entities;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Solicitud enviada desde un formulario público. Nombre y correo van en columnas propias para
 * listarlas y responder; el resto de campos, que cambian de un formulario a otro, van en `datos`
 * como JSON, cada uno con la etiqueta que tenía al enviarse.
 */
@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
@Entity
@Table(name = "solicitudes")
public class Solicitud {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "id_solicitud")
	private Integer idSolicitud;

	/** Número de resguardo que ve el visitante: prefijo del formulario, año e id (AMT-2026-0042). */
	@Column(unique = true, length = 20)
	private String referencia;

	@Column(nullable = false, length = 60)
	private String formulario;

	/** Organización y título del formulario al enviarse, para listarla sin depender de la definición. */
	@Column(nullable = false, length = 160)
	private String asunto;

	@Column(nullable = false, length = 120)
	private String nombre;

	@Column(nullable = false, length = 120)
	private String email;

	@Column(nullable = false, columnDefinition = "TEXT")
	private String datos;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 12)
	private EstadoSolicitud estado;

	@Column(name = "creada_en", nullable = false)
	private LocalDateTime creadaEn;

	@Column(name = "atendida_en")
	private LocalDateTime atendidaEn;
}
