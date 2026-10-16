package retotransversal.modelo.entities;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

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
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
@Entity
@Table(name = "eventos")
public class Evento {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "id_evento")
	private Integer idEvento;

	@Column(nullable = false, length = 50)
	private String nombre;

	@Column(length = 200)
	private String descripcion;

	@Column(name = "fecha_inicio", nullable = false)
	private LocalDate fechaInicio;

	/** La hora a la que empieza, en la hora de Madrid. Con la duración, da el horario (19:15 – 21:45). */
	@Column(name = "hora_inicio", nullable = false)
	private LocalTime horaInicio;

	private Integer duracion;

	@Column(length = 100)
	private String direccion;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private EstadoEvento estado;

	@Column(name = "aforo_maximo", nullable = false)
	private Integer aforoMaximo;

	@Column(name = "minimo_asistencia")
	private Integer minimoAsistencia;

	@Column(nullable = false, precision = 9, scale = 2)
	private BigDecimal precio;

	/**
	 * Archivada: fuera de la lista del panel, en su filtro «Archivadas». Solo las que ya no están
	 * activas (canceladas o terminadas); a la web y a las reservas de sus clientes no les cambia nada.
	 */
	@Builder.Default
	@Column(nullable = false)
	private boolean archivada = false;

	/** La foto propia, si se subió desde el panel: el nombre del archivo (ver ImagenSesionService). */
	@Column(length = 80)
	private String imagen;

	/** Cuándo empieza: su fecha y su hora. Desde ese momento ya no admite reservas. */
	public LocalDateTime inicio() {
		return fechaInicio.atTime(horaInicio == null ? java.time.LocalTime.MIDNIGHT : horaInicio);
	}

	/** Cuándo acaba: el inicio más la duración. Desde ese momento pasa a terminada. */
	public LocalDateTime fin() {
		return inicio().plusMinutes(duracion == null ? 0 : duracion);
	}

	@ManyToOne(fetch = FetchType.EAGER)
	@JoinColumn(name = "id_tipo", nullable = false)
	private TipoEvento tipoEvento;
}
