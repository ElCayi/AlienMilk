package retotransversal.modelo.service;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;

import retotransversal.exception.DemasiadasSolicitudesException;

class LimitadorSolicitudesTest {

	private Instant ahora = Instant.parse("2026-10-07T10:00:00Z");

	private final LimitadorSolicitudes limitador = new LimitadorSolicitudes(new Clock() {
		@Override
		public Instant instant() {
			return ahora;
		}

		@Override
		public ZoneId getZone() {
			return ZoneOffset.UTC;
		}

		@Override
		public Clock withZone(ZoneId zone) {
			return this;
		}
	});

	@Test
	void letsTheSameOriginSendAgainOnceTheWindowHasPassed() {
		for (int i = 0; i < LimitadorSolicitudes.POR_ORIGEN; i++) {
			limitador.registrar("10.0.0.1");
		}
		assertThatThrownBy(() -> limitador.registrar("10.0.0.1"))
				.isInstanceOf(DemasiadasSolicitudesException.class);
		assertThatCode(() -> limitador.registrar("10.0.0.2")).doesNotThrowAnyException();

		ahora = ahora.plus(LimitadorSolicitudes.VENTANA_ORIGEN).plus(Duration.ofSeconds(1));
		assertThatCode(() -> limitador.registrar("10.0.0.1")).doesNotThrowAnyException();
	}

	@Test
	void capsTheTotalAcrossOrigins() {
		for (int i = 0; i < LimitadorSolicitudes.GLOBAL; i++) {
			limitador.registrar("10.0.1." + i);
		}
		assertThatThrownBy(() -> limitador.registrar("10.0.2.1"))
				.isInstanceOf(DemasiadasSolicitudesException.class);
	}
}
