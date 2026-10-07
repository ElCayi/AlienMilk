package retotransversal.security;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

	@Value("${cors.allowed-origins:http://localhost:4200,http://127.0.0.1:4200}")
	private String allowedOriginsRaw;

	@Value("${cors.allowed-origin-patterns:}")
	private String allowedOriginPatternsRaw;

	@Bean
	public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
		http
				.cors(Customizer.withDefaults())
				.csrf(csrf -> csrf.disable())
				.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
				.authorizeHttpRequests(auth -> auth
						.requestMatchers(
								"/swagger-ui.html",
								"/swagger-ui/**",
								"/api-docs/**",
								"/error")
						.permitAll()
						.requestMatchers("/api/auth/register")
						.permitAll()
						.requestMatchers("/api/eventos/**")
						.permitAll()
						.requestMatchers(HttpMethod.GET, "/api/contacto", "/api/red-de-confianza", "/api/auth/demo-accounts")
						.permitAll()
						.requestMatchers("/api/admin/**")
						.hasRole("ADMON")
						.requestMatchers("/api/reservas/**", "/api/auth/me")
						.hasAnyRole("CLIENTE", "ADMON")
						.anyRequest()
						.authenticated())
				// Plain 401 without WWW-Authenticate: the SPA handles failures itself and
				// the browser must not pop up its native Basic Auth dialog.
				.httpBasic(basic -> basic.authenticationEntryPoint(
						(request, response, exception) -> response.sendError(HttpServletResponse.SC_UNAUTHORIZED)));

		return http.build();
	}

	@Bean
	public PasswordEncoder passwordEncoder() {
		return PasswordEncoderFactories.createDelegatingPasswordEncoder();
	}

	@Bean
	public CorsConfigurationSource corsConfigurationSource() {
		CorsConfiguration configuration = new CorsConfiguration();
		configuration.setAllowedOrigins(Arrays.asList(allowedOriginsRaw.split(",")));
		if (!allowedOriginPatternsRaw.isBlank()) {
			configuration.setAllowedOriginPatterns(Arrays.asList(allowedOriginPatternsRaw.split(",")));
		}
		configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
		configuration.setAllowedHeaders(List.of("*"));
		configuration.setAllowCredentials(true);

		UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
		source.registerCorsConfiguration("/**", configuration);
		return source;
	}
}
