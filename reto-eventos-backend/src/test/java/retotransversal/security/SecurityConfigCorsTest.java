package retotransversal.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.cors.CorsConfiguration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

class SecurityConfigCorsTest {

	@Test
	void developmentBackendAcceptsDifferentWorktreePorts() {
		SecurityConfig security = configured("http://localhost:4200",
				"http://127.0.0.1:[*],http://localhost:[*]");
		CorsConfiguration cors = security.corsConfigurationSource()
				.getCorsConfiguration(new MockHttpServletRequest("OPTIONS", "/api/contacto"));

		assertNotNull(cors);
		assertEquals("http://127.0.0.1:45110", cors.checkOrigin("http://127.0.0.1:45110"));
		assertEquals("http://localhost:45980", cors.checkOrigin("http://localhost:45980"));
		assertNull(cors.checkOrigin("https://example.org"));
	}

	@Test
	void exactOriginsRemainExactWithoutDevelopmentPatterns() {
		SecurityConfig security = configured("https://alienmilk.example", "");
		CorsConfiguration cors = security.corsConfigurationSource()
				.getCorsConfiguration(new MockHttpServletRequest("OPTIONS", "/api/contacto"));

		assertNotNull(cors);
		assertEquals("https://alienmilk.example", cors.checkOrigin("https://alienmilk.example"));
		assertNull(cors.checkOrigin("http://localhost:45110"));
	}

	private SecurityConfig configured(String origins, String patterns) {
		SecurityConfig security = new SecurityConfig();
		ReflectionTestUtils.setField(security, "allowedOriginsRaw", origins);
		ReflectionTestUtils.setField(security, "allowedOriginPatternsRaw", patterns);
		return security;
	}
}
