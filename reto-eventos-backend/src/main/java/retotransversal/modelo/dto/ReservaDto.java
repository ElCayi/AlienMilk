package retotransversal.modelo.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
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
	private String estadoEvento;

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
				.estadoEvento(reserva.getEvento().getEstado().name())
				.build();
	}

	private static String nombreCompleto(Reserva reserva) {
		String nombre = reserva.getUsuario().getNombre();
		String apellidos = reserva.getUsuario().getApellidos();
		return apellidos == null || apellidos.isBlank() ? nombre : nombre + " " + apellidos;
	}
}
