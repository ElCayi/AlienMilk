package retotransversal.modelo.entities;

import java.time.LocalDateTime;
import java.time.LocalTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Ficha de contacto de la sede. Hay una sola fila (id 1): se edita, no se crea ni se borra.
 */
@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
@Entity
@Table(name = "contacto")
public class Contacto {

	public static final int ID_FICHA = 1;

	@Id
	@Column(name = "id_contacto")
	private Integer idContacto;

	@Column(name = "nombre_sede", nullable = false, length = 80)
	private String nombreSede;

	@Column(nullable = false, length = 120)
	private String direccion;

	@Column(nullable = false, length = 80)
	private String ciudad;

	@Column(nullable = false, length = 100)
	private String email;

	@Column(length = 30)
	private String telefono;

	/** Días de apertura en ISO-8601 (1 = lunes … 7 = domingo), separados por comas. */
	@Column(name = "dias_apertura", nullable = false, length = 20)
	private String diasApertura;

	@Column(name = "hora_apertura", nullable = false)
	private LocalTime horaApertura;

	/** Si es anterior a la apertura, el cierre cae en la madrugada siguiente. */
	@Column(name = "hora_cierre", nullable = false)
	private LocalTime horaCierre;

	@Column(name = "zona_horaria", nullable = false, length = 40)
	private String zonaHoraria;

	@Column(name = "como_llegar", length = 300)
	private String comoLlegar;

	@Column(name = "condiciones_acceso", length = 300)
	private String condicionesAcceso;

	@Column(name = "actualizado_en")
	private LocalDateTime actualizadoEn;

	@Column(name = "actualizado_por", length = 45)
	private String actualizadoPor;
}
