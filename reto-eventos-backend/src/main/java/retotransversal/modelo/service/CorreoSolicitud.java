package retotransversal.modelo.service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Locale;

import org.springframework.web.util.HtmlUtils;

import retotransversal.modelo.dto.SolicitudDto;
import retotransversal.modelo.formularios.DatoSolicitud;

/**
 * El correo que avisa de una solicitud: asunto, texto plano y HTML. Sirve para cualquier formulario
 * del molde porque solo usa lo que guarda toda solicitud (referencia, asunto y datos con etiqueta).
 * Todo lo que escribió el visitante se escapa antes de entrar en el HTML.
 */
public final class CorreoSolicitud {

	private static final DateTimeFormatter FECHA = DateTimeFormatter
			.ofPattern("d 'de' MMMM 'de' yyyy, 'a las' HH:mm", Locale.forLanguageTag("es-ES"));

	private static final DateTimeFormatter DIA = DateTimeFormatter.ofPattern("d 'de' MMMM 'de' yyyy",
			Locale.forLanguageTag("es-ES"));

	private CorreoSolicitud() {
	}

	public static String asunto(SolicitudDto solicitud) {
		// Una cabecera no admite saltos de línea; el asunto viene de la definición, pero por si acaso.
		return (solicitud.referencia() + " · " + solicitud.asunto()).replaceAll("[\\r\\n]+", " ");
	}

	public static String texto(SolicitudDto solicitud, String panel) {
		StringBuilder texto = new StringBuilder()
				.append("Nueva solicitud en AlienMilk Sessions\n\n")
				.append(solicitud.referencia()).append('\n')
				.append(solicitud.asunto()).append('\n')
				.append("Recibida el ").append(FECHA.format(solicitud.creadaEn())).append("\n\n");
		for (DatoSolicitud dato : solicitud.datos()) {
			texto.append(dato.etiqueta()).append(": ").append(legible(dato.valor())).append('\n');
		}
		texto.append("\nResponde a este correo para escribir directamente a ").append(solicitud.nombre())
				.append(".\n");
		if (tiene(panel)) {
			texto.append("Bandeja de solicitudes: ").append(panel).append('\n');
		}
		return texto.toString();
	}

	public static String html(SolicitudDto solicitud, String panel) {
		StringBuilder filas = new StringBuilder();
		for (DatoSolicitud dato : solicitud.datos()) {
			filas.append("""
					<tr>
					  <th style="width:36%%;padding:12px 16px 10px 0;border-top:1px solid #dcdfdc;color:#3d474e;font-size:13px;line-height:1.4;font-weight:700;text-align:left;vertical-align:top">%s</th>
					  <td style="padding:10px 0;border-top:1px solid #dcdfdc;color:#1f2930;font-size:15px;line-height:1.5;vertical-align:top;white-space:pre-wrap">%s</td>
					</tr>
					""".formatted(escapar(dato.etiqueta()), escapar(legible(dato.valor()))));
		}
		String enlacePanel = !tiene(panel) ? "" : """
				<p style="margin:12px 0 0"><a href="%s" style="color:#1f2930;font-weight:700">Abrir la bandeja de solicitudes</a></p>
				""".formatted(escapar(panel));

		return """
				<!DOCTYPE html>
				<html lang="es">
				<body style="margin:0;padding:24px 12px;background:#f8f6f2;font-family:Nunito,Arial,sans-serif;color:#1f2930">
				  <div style="max-width:560px;margin:0 auto;padding:28px;border-top:4px solid #ff7f7f;border-radius:6px;background:#ffffff">
				    <p style="margin:0;color:#3d474e;font-size:11px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase">AlienMilk Sessions · Nueva solicitud</p>
				    <p style="margin:10px 0 0;font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif;font-size:34px;line-height:1;letter-spacing:0.04em">%s</p>
				    <p style="margin:8px 0 0;font-size:16px;font-weight:700">%s</p>
				    <p style="margin:4px 0 20px;color:#3d474e;font-size:13px">Recibida el %s</p>
				    <table role="presentation" style="width:100%%;border-collapse:collapse">
				%s    </table>
				    <p style="margin:24px 0 0;color:#3d474e;font-size:13px;line-height:1.5">Responde a este correo para escribir directamente a %s.</p>
				%s  </div>
				</body>
				</html>
				""".formatted(escapar(solicitud.referencia()), escapar(solicitud.asunto()),
				FECHA.format(solicitud.creadaEn()), filas, escapar(solicitud.nombre()), enlacePanel);
	}

	/** Las fechas llegan como 2026-11-14; en el correo se leen mejor como «14 de noviembre de 2026». */
	private static String legible(String valor) {
		if (valor == null || !valor.matches("\\d{4}-\\d{2}-\\d{2}")) {
			return valor;
		}
		try {
			return DIA.format(LocalDate.parse(valor));
		} catch (DateTimeParseException ex) {
			return valor;
		}
	}

	private static String escapar(String valor) {
		return HtmlUtils.htmlEscape(valor == null ? "" : valor);
	}

	private static boolean tiene(String valor) {
		return valor != null && !valor.isBlank();
	}
}
