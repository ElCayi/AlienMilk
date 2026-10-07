package retotransversal.modelo.dto;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** La red de confianza de la portada: las distinciones, los socios de la cinta y las cifras de la casa, en orden. */
@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
public class RedConfianzaDto {

	private List<Premio> premios;
	private List<Socio> socios;
	private List<Cifra> cifras;

	@AllArgsConstructor
	@NoArgsConstructor
	@Data
	@Builder
	public static class Premio {
		private String sigla;
		private String nombre;
		private String otorgante;
		private String fecha;
	}

	@AllArgsConstructor
	@NoArgsConstructor
	@Data
	@Builder
	public static class Socio {
		private String nombre;
		private String estilo;
		private String emblema;
	}

	@AllArgsConstructor
	@NoArgsConstructor
	@Data
	@Builder
	public static class Cifra {
		private String clave;
		private String rotulo;
		private String valor;
		private String unidad;
		private String nota;
	}
}
