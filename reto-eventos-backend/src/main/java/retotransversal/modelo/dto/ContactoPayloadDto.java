package retotransversal.modelo.dto;

import java.time.LocalTime;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Data
public class ContactoPayloadDto {

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
}
