package retotransversal.modelo.pagos;

import java.time.Instant;

/** Una sesión de pago abierta: dónde se paga y hasta cuándo. */
public record SesionPago(String id, String url, Instant caducaEn) {
}
