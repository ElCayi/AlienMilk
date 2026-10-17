package retotransversal.modelo.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonFormat;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import retotransversal.modelo.entities.EstadoPago;
import retotransversal.modelo.entities.Reserva;

@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
public class ReservaDto {

	private Integer idReserva;
	private Integer idEvento;
	private String nombreEvento;
	private String username;
	/** El correo de la cuenta, o el que se dio al reservar sin cuenta (puede faltar). */
	private String clienteCorreo;
	/** Nombre y apellidos de la cuenta, o el nombre que se dio al reservar sin cuenta. */
	private String nombreCliente;
	private Integer cantidad;
	private BigDecimal precioVenta;
	private String observaciones;
	private LocalDate fechaInicioEvento;
	@JsonFormat(pattern = "HH:mm")
	private LocalTime horaInicioEvento;
	private Integer duracionEvento;
	private String estadoEvento;
	/** Si su sesión está archivada: la reserva sale de la vista diaria y se queda en el archivo con ella. */
	private boolean sesionArchivada;

	/** El registro de asistencia (vacío en las reservas anteriores a él o tomadas desde el panel). */
	private List<AsistenteDto> asistentes;
	private String telefono;
	private String adaptaciones;
	private boolean materialExterno;
	private String materialDescripcion;
	private LocalDateTime conformidadEn;
	/** Con adaptaciones o material externo: AlienMilk tiene que evaluarla antes de la sesión. */
	private boolean requiereRevision;
	/** La revisión: PENDIENTE, ACEPTADA o NO_ACEPTADA; null si no pide adaptaciones ni material. */
	private String revision;
	private String revisionNota;
	private LocalDateTime revisadaEn;

	/** La cancelación, si la hubo: la reserva no se borra (ver Reserva#canceladaEn). */
	private LocalDateTime canceladaEn;
	private String canceladaPor;
	private String motivoCancelacion;

	/** El cobro (ver EstadoPago). La página de pago solo mientras está pendiente. */
	private String estadoPago;
	private String pagoUrl;
	private LocalDateTime pagoCaducaEn;
	private LocalDateTime pagadaEn;
	/** Lo devuelto o por devolver (la suma de sus devoluciones, hechas o pendientes). */
	private BigDecimal importeDevuelto;
	/** Cada devolución, con su medio y su estado (ver Devolucion). */
	private List<DevolucionDto> devoluciones;
	/** En las reservas sin registrar, cuántas plazas han entrado ya (las registradas lo dicen por participante). */
	private int entradasSinRegistrar;

	public static ReservaDto fromEntity(Reserva reserva) {
		return ReservaDto.builder()
				.idReserva(reserva.getIdReserva())
				.idEvento(reserva.getEvento().getIdEvento())
				.nombreEvento(reserva.getEvento().getNombre())
				.username(reserva.getUsuario() == null ? null : reserva.getUsuario().getUsername())
				.clienteCorreo(reserva.getUsuario() == null ? reserva.getClienteCorreo() : reserva.getUsuario().getEmail())
				.nombreCliente(nombreCompleto(reserva))
				.cantidad(reserva.getCantidad())
				.precioVenta(reserva.getPrecioVenta())
				.observaciones(reserva.getObservaciones())
				.fechaInicioEvento(reserva.getEvento().getFechaInicio())
				.horaInicioEvento(reserva.getEvento().getHoraInicio())
				.duracionEvento(reserva.getEvento().getDuracion())
				.estadoEvento(reserva.getEvento().getEstado().name())
				.sesionArchivada(reserva.getEvento().isArchivada())
				.asistentes(reserva.getAsistentes().stream().map(AsistenteDto::de).toList())
				.telefono(reserva.getTelefono())
				.adaptaciones(reserva.getAdaptaciones())
				.materialExterno(reserva.isMaterialExterno())
				.materialDescripcion(reserva.getMaterialDescripcion())
				.conformidadEn(reserva.getConformidadEn())
				.requiereRevision(reserva.requiereRevision())
				.revision(!reserva.pideAdaptaciones() ? null
						: reserva.getRevisionAceptada() == null ? "PENDIENTE"
								: reserva.getRevisionAceptada() ? "ACEPTADA" : "NO_ACEPTADA")
				.revisionNota(reserva.getRevisionNota())
				.revisadaEn(reserva.getRevisadaEn())
				.canceladaEn(reserva.getCanceladaEn())
				.canceladaPor(reserva.getCanceladaPor() == null ? null : reserva.getCanceladaPor().name())
				.motivoCancelacion(reserva.getMotivoCancelacion())
				.estadoPago(reserva.getEstadoPago().name())
				.pagoUrl(reserva.getEstadoPago() == EstadoPago.PENDIENTE && !reserva.cancelada() ? reserva.getPagoUrl() : null)
				.pagoCaducaEn(reserva.getPagoCaducaEn())
				.pagadaEn(reserva.getPagadaEn())
				.importeDevuelto(reserva.getImporteDevuelto())
				.devoluciones(reserva.getDevoluciones().stream().map(DevolucionDto::de).toList())
				.entradasSinRegistrar(reserva.getEntradasSinRegistrar())
				.build();
	}

	private static String nombreCompleto(Reserva reserva) {
		if (reserva.getUsuario() == null) {
			return reserva.getClienteNombre();
		}
		String nombre = reserva.getUsuario().getNombre();
		String apellidos = reserva.getUsuario().getApellidos();
		return apellidos == null || apellidos.isBlank() ? nombre : nombre + " " + apellidos;
	}
}
