package retotransversal.modelo.entities;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.Fetch;
import org.hibernate.annotations.FetchMode;

import jakarta.persistence.CascadeType;
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

	/**
	 * La cuenta de quien reserva; null en las reservas por teléfono sin cuenta y en las de cuentas que se
	 * borraron. Entonces habla por ella clienteNombre (y clienteCorreo, si se dio).
	 */
	@ManyToOne(fetch = FetchType.EAGER)
	@JoinColumn(name = "username")
	private Usuario usuario;

	@Column(name = "cliente_nombre", length = 120)
	private String clienteNombre;

	@Column(name = "cliente_correo", length = 120)
	private String clienteCorreo;

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

	/**
	 * En las reservas sin participantes registrados, cuántas de sus plazas han pasado ya el control de
	 * ingreso (en las registradas, cada participante guarda su propia entrada).
	 */
	@Builder.Default
	@Column(name = "entradas_sin_registrar", nullable = false)
	private int entradasSinRegistrar = 0;

	/** Cuándo se confirmaron la edad mínima y las condiciones de acceso. */
	@Column(name = "conformidad_en")
	private LocalDateTime conformidadEn;

	/**
	 * Una reserva cancelada no se borra: libera sus plazas y se queda en el historial con quién la
	 * canceló, cuándo y por qué. Sin fecha, la reserva está viva.
	 */
	@Column(name = "cancelada_en")
	private LocalDateTime canceladaEn;

	@Enumerated(EnumType.STRING)
	@Column(name = "cancelada_por", length = 20)
	private CanceladaPor canceladaPor;

	@Column(name = "motivo_cancelacion", length = 200)
	private String motivoCancelacion;

	/** El cobro: ver EstadoPago. Las reservas anteriores al pago con tarjeta quedan como pagadas. */
	@Builder.Default
	@Enumerated(EnumType.STRING)
	@Column(name = "estado_pago", nullable = false, length = 20)
	private EstadoPago estadoPago = EstadoPago.PAGADA;

	/** La sesión de pago de Stripe, su página y hasta cuándo se puede pagar (solo mientras está pendiente). */
	@Column(name = "pago_sesion", length = 100)
	private String pagoSesion;

	@Column(name = "pago_url", length = 500)
	private String pagoUrl;

	@Column(name = "pago_caduca_en")
	private LocalDateTime pagoCaducaEn;

	/** El cobro hecho en Stripe, para poder devolverlo; null si se cobró en taquilla o sin pasarela. */
	@Column(name = "pago_id", length = 100)
	private String pagoId;

	@Column(name = "pagada_en")
	private LocalDateTime pagadaEn;

	/**
	 * Las devoluciones, cada una con su registro (ver Devolucion). importeDevuelto es su suma, hechas o
	 * pendientes de entregar en taquilla: lo que ya no se debe cobrar ni volver a devolver.
	 */
	@Builder.Default
	@OneToMany(mappedBy = "reserva", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
	@OrderBy("idDevolucion")
	// Con una consulta aparte: dos listas EAGER a la vez, Hibernate no las sabe traer de una.
	@Fetch(FetchMode.SELECT)
	@ToString.Exclude
	@EqualsAndHashCode.Exclude
	private List<Devolucion> devoluciones = new ArrayList<>();

	/** Lo devuelto o por devolver: la diferencia cada vez que bajó el importe y, al cancelar, lo que quedaba. */
	@Builder.Default
	@Column(name = "importe_devuelto", nullable = false, precision = 9, scale = 2)
	private BigDecimal importeDevuelto = BigDecimal.ZERO;

	/**
	 * La revisión de las adaptaciones y el material: aceptadas o no (null, sin revisar), con la nota que
	 * verá el cliente y cuándo se decidió.
	 */
	@Column(name = "revision_aceptada")
	private Boolean revisionAceptada;

	@Column(name = "revision_nota", length = 300)
	private String revisionNota;

	@Column(name = "revisada_en")
	private LocalDateTime revisadaEn;

	/** Si es de esa cuenta: las reservas sin cuenta no son de nadie que pueda entrar en Mi panel. */
	public boolean esDe(String username) {
		return usuario != null && usuario.getUsername().equals(username);
	}

	public boolean cancelada() {
		return canceladaEn != null;
	}

	/** Deshace la cancelación (ver ReservaService#reactivar). */
	public void reactivar() {
		canceladaEn = null;
		canceladaPor = null;
		motivoCancelacion = null;
	}

	/** Cancelar no borra: deja la reserva con quién, cuándo y por qué, y deja de ocupar plazas. */
	public void cancelar(CanceladaPor quien, String motivo, LocalDateTime cuando) {
		canceladaEn = cuando;
		canceladaPor = quien;
		motivoCancelacion = motivo;
		pagoUrl = null;
	}

	/** Con adaptaciones o material externo, alguien de AlienMilk tiene que evaluarla antes de la sesión. */
	public boolean pideAdaptaciones() {
		return (adaptaciones != null && !adaptaciones.isBlank()) || materialExterno;
	}

	/** Pide adaptaciones o material y nadie las ha evaluado todavía. */
	public boolean requiereRevision() {
		return !cancelada() && pideAdaptaciones() && revisionAceptada == null;
	}

	/** Lo que se aceptó era otra cosa: si cambian las adaptaciones o el material, se vuelve a revisar. */
	public void reabrirRevision() {
		revisionAceptada = null;
		revisionNota = null;
		revisadaEn = null;
	}
}
