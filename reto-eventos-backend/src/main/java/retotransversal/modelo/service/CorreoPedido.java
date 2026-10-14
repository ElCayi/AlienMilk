package retotransversal.modelo.service;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

import org.springframework.web.util.HtmlUtils;

import retotransversal.modelo.dto.LineaPedidoDto;
import retotransversal.modelo.dto.PedidoDto;
import retotransversal.modelo.entities.EntregaPedido;
import retotransversal.modelo.entities.EstadoPedido;

/**
 * El correo al comprador de un pedido: asunto, texto plano y HTML, con el mismo aspecto que el aviso
 * de solicitudes. Las frases son las del resguardo de la tienda (features/shop/order-receipt), para
 * que el correo y la página digan lo mismo. Lo que escribió el comprador se escapa en el HTML.
 */
public final class CorreoPedido {

	private static final Locale ES = Locale.forLanguageTag("es-ES");
	private static final DateTimeFormatter DIA = DateTimeFormatter.ofPattern("d 'de' MMMM", ES);
	private static final DateTimeFormatter HORA = DateTimeFormatter.ofPattern("HH:mm", ES);

	private CorreoPedido() {
	}

	public static String asunto(PedidoAvisoEvent aviso) {
		PedidoDto pedido = aviso.pedido();
		String que = switch (aviso.motivo()) {
			case RECIBIDO -> pedido.estado() == EstadoPedido.PENDIENTE_PAGO ? "Pedido reservado, pendiente de pago"
					: "Pedido confirmado";
			case PAGADO -> "Pago recibido, pedido confirmado";
			case ENVIADO -> "Su pedido está en camino";
			case ENTREGADO -> pedido.entrega() == EntregaPedido.RECOGIDA ? "Pedido recogido" : "Pedido entregado";
			case ANULADO -> "Pedido anulado";
			case CADUCADO -> "Pedido anulado: no se pagó a tiempo";
		};
		return pedido.referencia() + " · " + que;
	}

	/** Lo que ha pasado, en una o dos frases. */
	static String mensaje(PedidoAvisoEvent aviso) {
		PedidoDto pedido = aviso.pedido();
		boolean recogida = pedido.entrega() == EntregaPedido.RECOGIDA;
		String preparacion = recogida
				? "Lo preparamos en el centro de distribución y le esperará en la sede, en cadena de frío, a partir de mañana. Conserve este número para recogerlo."
				: "Lo preparamos en el centro de distribución y saldrá en cadena de frío hacia " + pedido.direccion()
						+ ". Le avisaremos cuando salga.";
		return switch (aviso.motivo()) {
			case RECIBIDO -> pedido.estado() == EstadoPedido.PENDIENTE_PAGO
					? "Sus unidades están reservadas a la espera del pago" + hasta(pedido.pagoCaducaEn())
							+ ". Si no se paga a tiempo, el pedido se anula solo y vuelven al centro de distribución."
					: "Hemos recibido su pedido. " + preparacion;
			case PAGADO -> "Hemos recibido el pago. " + preparacion;
			case ENVIADO -> "Ha salido del centro de distribución" + el(pedido.enviadoEn())
					+ ", en cadena de frío, hacia " + pedido.direccion() + ". Llegará en 48 horas.";
			case ENTREGADO -> (recogida ? "Recogido en la sede" : "Entregado") + el(pedido.entregadoEn())
					+ ". Que lo disfrute.";
			case ANULADO -> "El pedido se ha anulado y sus unidades han vuelto al centro de distribución."
					+ (aviso.reembolsado() ? " Le hemos devuelto " + precio(pedido.total())
							+ " por el mismo medio de pago; según su banco, puede tardar unos días en verlo."
							: "");
			case CADUCADO -> "No se pagó a tiempo, así que el pedido se ha anulado y sus unidades han vuelto al centro de distribución. No se le ha cobrado nada.";
		};
	}

	public static String texto(PedidoAvisoEvent aviso, String devoluciones) {
		PedidoDto pedido = aviso.pedido();
		StringBuilder texto = new StringBuilder()
				.append("Hola, ").append(aviso.nombre()).append(":\n\n")
				.append(mensaje(aviso)).append("\n\n")
				.append("Pedido ").append(pedido.referencia()).append('\n');
		for (LineaPedidoDto linea : pedido.lineas()) {
			texto.append(linea.cantidad()).append(" × ").append(linea.nombre()).append(": ")
					.append(precio(linea.importe())).append('\n');
		}
		texto.append(entrega(pedido)).append(": ").append(gastos(pedido)).append('\n')
				.append("Total: ").append(precio(pedido.total())).append("\n\n");
		if (pagable(aviso)) {
			texto.append("Pagar el pedido: ").append(pedido.pagoUrl()).append('\n');
		}
		if (tiene(aviso.enlace())) {
			texto.append("Ver el pedido: ").append(aviso.enlace()).append('\n');
		}
		texto.append(nota(aviso)).append("\n\n")
				.append("Anulaciones y devoluciones: ").append(devoluciones).append('\n')
				.append("AlienMilk / Distribución\n");
		return texto.toString();
	}

	public static String html(PedidoAvisoEvent aviso, String devoluciones) {
		PedidoDto pedido = aviso.pedido();
		StringBuilder filas = new StringBuilder();
		for (LineaPedidoDto linea : pedido.lineas()) {
			filas.append(fila(linea.cantidad() + " × " + linea.nombre(), precio(linea.importe()), false));
		}
		filas.append(fila(entrega(pedido), gastos(pedido), false));
		filas.append(fila("Total", precio(pedido.total()), true));

		StringBuilder botones = new StringBuilder();
		if (pagable(aviso)) {
			botones.append(boton(pedido.pagoUrl(), "Pagar el pedido"));
		}
		if (tiene(aviso.enlace())) {
			botones.append(boton(aviso.enlace(), "Ver el pedido"));
		}

		return """
				<!DOCTYPE html>
				<html lang="es">
				<body style="margin:0;padding:24px 12px;background:#f8f6f2;font-family:Nunito,Arial,sans-serif;color:#1f2930">
				  <div style="max-width:560px;margin:0 auto;padding:28px;border-top:4px solid #ff7f7f;border-radius:6px;background:#ffffff">
				    <p style="margin:0;color:#3d474e;font-size:11px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase">AlienMilk / Distribución · Su pedido</p>
				    <p style="margin:10px 0 0;font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif;font-size:34px;line-height:1;letter-spacing:0.04em">%s</p>
				    <p style="margin:20px 0 0;font-size:15px;line-height:1.55">Hola, %s:</p>
				    <p style="margin:8px 0 20px;font-size:15px;line-height:1.55">%s</p>
				    <table role="presentation" style="width:100%%;border-collapse:collapse">
				%s    </table>
				%s    <p style="margin:24px 0 0;color:#3d474e;font-size:13px;line-height:1.5">%s</p>
				    <p style="margin:12px 0 0;color:#3d474e;font-size:13px;line-height:1.5"><a href="%s" style="color:#1f2930">Anulaciones y devoluciones</a></p>
				  </div>
				</body>
				</html>
				""".formatted(escapar(pedido.referencia()), escapar(aviso.nombre()), escapar(mensaje(aviso)), filas,
				botones, escapar(nota(aviso)), escapar(devoluciones));
	}

	/**
	 * Al pie: el invitado no tiene cuenta, así que el enlace privado es su único camino de vuelta, y
	 * solo llega en el primer correo.
	 */
	private static String nota(PedidoAvisoEvent aviso) {
		if (!aviso.pedido().invitado()) {
			return "Puede seguirlo y anularlo, mientras no haya salido, desde Mi panel.";
		}
		return aviso.motivo() == PedidoAvisoEvent.Motivo.RECIBIDO
				? "Guarde este correo: el enlace es la única forma de consultar el pedido o anularlo mientras no haya salido."
				: "Para consultarlo, use el enlace privado del correo con el que lo recibimos.";
	}

	private static boolean pagable(PedidoAvisoEvent aviso) {
		return aviso.motivo() == PedidoAvisoEvent.Motivo.RECIBIDO && tiene(aviso.pedido().pagoUrl());
	}

	private static String fila(String rotulo, String valor, boolean total) {
		String peso = total ? "font-weight:800;" : "";
		return """
				<tr>
				  <th style="padding:10px 16px 10px 0;border-top:1px solid #dcdfdc;color:#3d474e;font-size:14px;line-height:1.4;%stext-align:left;vertical-align:top">%s</th>
				  <td style="padding:10px 0;border-top:1px solid #dcdfdc;color:#1f2930;font-size:15px;line-height:1.4;%stext-align:right;white-space:nowrap;vertical-align:top">%s</td>
				</tr>
				""".formatted(peso, escapar(rotulo), peso, escapar(valor));
	}

	private static String boton(String url, String rotulo) {
		return """
				    <p style="margin:20px 0 0"><a href="%s" style="display:inline-block;padding:11px 20px;border-radius:999px;background:#1f2930;color:#ffffff;font-weight:700;text-decoration:none">%s</a></p>
				""".formatted(escapar(url), escapar(rotulo));
	}

	private static String entrega(PedidoDto pedido) {
		return pedido.entrega() == EntregaPedido.RECOGIDA ? "Recogida en sede" : "Envío refrigerado";
	}

	private static String gastos(PedidoDto pedido) {
		return pedido.gastosEnvio() == null || pedido.gastosEnvio().signum() == 0 ? "Sin gastos"
				: precio(pedido.gastosEnvio());
	}

	private static String hasta(LocalDateTime caduca) {
		return caduca == null ? "" : ", hasta las " + HORA.format(caduca);
	}

	private static String el(LocalDateTime cuando) {
		return cuando == null ? "" : " el " + DIA.format(cuando);
	}

	static String precio(BigDecimal importe) {
		NumberFormat formato = NumberFormat.getCurrencyInstance(ES);
		return formato.format(importe == null ? BigDecimal.ZERO : importe).replace(' ', ' ');
	}

	private static String escapar(String valor) {
		return HtmlUtils.htmlEscape(valor == null ? "" : valor);
	}

	private static boolean tiene(String valor) {
		return valor != null && !valor.isBlank();
	}
}
