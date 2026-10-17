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
	/** Nombre y apellidos de la cuenta, para el panel de administración. */
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

	/** La cancelación, si la hubo: la reserva no se borra (ver Reserva#canceladaEn). */
	private LocalDateTime canceladaEn;
	private String canceladaPor;
	private String motivoCancelacion;

	/** El cobro (ver EstadoPago). La página de pago solo mientras está pendiente. */
	private String estadoPago;
	private String pagoUrl;
	private LocalDateTime pagoCaducaEn;
	private LocalDateTime pagadaEn;
	private BigDecimal importeDevuelto;

	public static ReservaDto fromEntity(Reserva reserva) {
		return ReservaDto.builder()
				.idReserva(reserva.getIdReserva())
				.idEvento(reserva.getEvento().getIdEvento())
				.nombreEvento(reserva.getEvento().getNombre())
				.username(reserva.getUsuario().getUsername())
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
				.canceladaEn(reserva.getCanceladaEn())
				.canceladaPor(reserva.getCanceladaPor() == null ? null : reserva.getCanceladaPor().name())
				.motivoCancelacion(reserva.getMotivoCancelacion())
				.estadoPago(reserva.getEstadoPago().name())
				.pagoUrl(reserva.getEstadoPago() == EstadoPago.PENDIENTE && !reserva.cancelada() ? reserva.getPagoUrl() : null)
				.pagoCaducaEn(reserva.getPagoCaducaEn())
				.pagadaEn(reserva.getPagadaEn())
				.importeDevuelto(reserva.getImporteDevuelto())
				.build();
	}

	private static String nombreCompleto(Reserva reserva) {
		String nombre = reserva.getUsuario().getNombre();
		String apellidos = reserva.getUsuario().getApellidos();
		return apellidos == null || apellidos.isBlank() ? nombre : nombre + " " + apellidos;
	}
}
