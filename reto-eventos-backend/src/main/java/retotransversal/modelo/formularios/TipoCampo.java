package retotransversal.modelo.formularios;

import com.fasterxml.jackson.annotation.JsonProperty;

/** Tipos de campo que sabe validar el backend y pintar el frontend. */
public enum TipoCampo {

	@JsonProperty("texto")
	TEXTO,

	@JsonProperty("email")
	EMAIL,

	@JsonProperty("texto-largo")
	TEXTO_LARGO,

	@JsonProperty("numero")
	NUMERO,

	@JsonProperty("fecha")
	FECHA,

	@JsonProperty("seleccion")
	SELECCION
}
