package retotransversal.modelo.dto;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import retotransversal.modelo.entities.Contacto;

@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
public class ContactoDto {

	private String nombreSede;
	private String direccion;
	private String ciudad;
	private String email;
	private String telefono;
	private List<Integer> diasApertura;
	private LocalTime horaApertura;
	private LocalTime horaCierre;
	private String zonaHoraria;
	private String comoLlegar;
	private String condicionesAcceso;
	private LocalDateTime actualizadoEn;
	private String actualizadoPor;

	public static ContactoDto fromEntity(Contacto contacto) {
		return ContactoDto.builder()
				.nombreSede(contacto.getNombreSede())
				.direccion(contacto.getDireccion())
				.ciudad(contacto.getCiudad())
				.email(contacto.getEmail())
				.telefono(contacto.getTelefono())
				.diasApertura(Arrays.stream(contacto.getDiasApertura().split(","))
						.map(String::trim)
						.filter(dia -> !dia.isEmpty())
						.map(Integer::valueOf)
						.toList())
				.horaApertura(contacto.getHoraApertura())
				.horaCierre(contacto.getHoraCierre())
				.zonaHoraria(contacto.getZonaHoraria())
				.comoLlegar(contacto.getComoLlegar())
				.condicionesAcceso(contacto.getCondicionesAcceso())
				.actualizadoEn(contacto.getActualizadoEn())
				.actualizadoPor(contacto.getActualizadoPor())
				.build();
	}
}
