package retotransversal.modelo.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.security.Principal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import retotransversal.exception.GlobalExceptionHandler;
import retotransversal.modelo.entities.EstadoPedido;
import retotransversal.modelo.entities.Pedido;
import retotransversal.modelo.entities.Perfil;
import retotransversal.modelo.entities.Usuario;
import retotransversal.modelo.repository.PedidoRepository;
import retotransversal.modelo.repository.PerfilRepository;
import retotransversal.modelo.repository.ReservaRepository;
import retotransversal.modelo.repository.UsuarioRepository;
import retotransversal.modelo.service.DemoAccountService;
import retotransversal.modelo.service.PerfilService;
import retotransversal.restcontroller.AuthRestController;
import retotransversal.restcontroller.UsuarioRestController;

/** Cuentas desde el panel: contraseña obligatoria al dar de alta y nadie se deja fuera a sí mismo. */
class AdminUsuariosTest {

	private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
	private final PerfilRepository perfiles = mock(PerfilRepository.class);
	private final PedidoRepository pedidos = mock(PedidoRepository.class);
	private final PasswordEncoder codificador = PasswordEncoderFactories.createDelegatingPasswordEncoder();
	private final Perfil admin = Perfil.builder().idPerfil(1).nombre("ROLE_ADMON").build();
	private final Perfil cliente = Perfil.builder().idPerfil(2).nombre("ROLE_CLIENTE").build();
	private final Principal sesion = () -> "admin";

	private final MockMvc mvc = MockMvcBuilders
			.standaloneSetup(new UsuarioRestController(
					new UsuarioServiceImpl(usuarios, mock(ReservaRepository.class), pedidos, codificador), perfiles,
					usuarios))
			.setControllerAdvice(new GlobalExceptionHandler()).build();

	{
		when(perfiles.findById(1)).thenReturn(Optional.of(admin));
		when(perfiles.findById(2)).thenReturn(Optional.of(cliente));
		when(usuarios.save(any())).thenAnswer(call -> call.getArgument(0));
	}

	@Test
	void aNewAccountNeedsAPasswordInsteadOfGetting1234() throws Exception {
		mvc.perform(post("/api/admin/usuarios").contentType(MediaType.APPLICATION_JSON)
				.content("{\"username\": \"ripley\", \"email\": \"ripley@nostromo.space\", \"nombre\": \"Ellen\", \"idPerfil\": 2}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errores.password").value("Escribe una contraseña"));
		verify(usuarios, never()).save(any());
	}

	@Test
	void theServerSetsTheRegistrationDateAndEncodesThePassword() throws Exception {
		mvc.perform(post("/api/admin/usuarios").contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"username": " ripley ", "password": "nostromo", "email": "ripley@nostromo.space",
						 "nombre": "Ellen", "fechaRegistro": "1979-05-25", "idPerfil": 2}
						"""))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.username").value("ripley"))
				.andExpect(jsonPath("$.enabled").value(1));

		ArgumentCaptor<Usuario> guardado = ArgumentCaptor.forClass(Usuario.class);
		verify(usuarios).save(guardado.capture());
		assertThat(codificador.matches("nostromo", guardado.getValue().getPassword())).isTrue();
		assertThat(guardado.getValue().getFechaRegistro()).isEqualTo(LocalDate.now());
	}

	@Test
	void editingKeepsThePasswordAndTheRegistrationDate() throws Exception {
		Usuario ana = Usuario.builder().username("ana").password("{noop}1234").email("ana@reto.com").nombre("Ana")
				.enabled(1).fechaRegistro(LocalDate.of(2026, 3, 31)).perfil(cliente).build();
		when(usuarios.findById("ana")).thenReturn(Optional.of(ana));

		mvc.perform(put("/api/admin/usuarios/ana").principal(sesion).contentType(MediaType.APPLICATION_JSON)
				.content("{\"email\": \"ana@reto.com\", \"nombre\": \"Ana María\", \"enabled\": 0, \"idPerfil\": 2}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.nombre").value("Ana María"))
				.andExpect(jsonPath("$.enabled").value(0));

		ArgumentCaptor<Usuario> guardado = ArgumentCaptor.forClass(Usuario.class);
		verify(usuarios).save(guardado.capture());
		assertThat(guardado.getValue().getPassword()).isEqualTo("{noop}1234");
		assertThat(guardado.getValue().getFechaRegistro()).isEqualTo(LocalDate.of(2026, 3, 31));
	}

	@Test
	void theAdministratorCannotLockThemselvesOut() throws Exception {
		mvc.perform(put("/api/admin/usuarios/admin").principal(sesion).contentType(MediaType.APPLICATION_JSON)
				.content("{\"email\": \"admin@reto.com\", \"nombre\": \"Administrador\", \"enabled\": 0, \"idPerfil\": 1}"))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.message").value("No puedes desactivar tu propia cuenta"));
		mvc.perform(put("/api/admin/usuarios/admin").principal(sesion).contentType(MediaType.APPLICATION_JSON)
				.content("{\"email\": \"admin@reto.com\", \"nombre\": \"Administrador\", \"enabled\": 1, \"idPerfil\": 2}"))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.message").value("No puedes quitarte el perfil de administrador"));
		mvc.perform(delete("/api/admin/usuarios/admin").principal(sesion))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.message").value("No puedes borrar tu propia cuenta"));
		verify(usuarios, never()).save(any());
		verify(usuarios, never()).deleteById(any());
	}

	@Test
	void ordersInProgressStopTheDeletionAndClosedOnesStayAsARecord() throws Exception {
		Usuario luis = Usuario.builder().username("luis").nombre("Luis").apellidos("Garcia").email("luis@reto.com")
				.perfil(cliente).build();
		Pedido enCamino = Pedido.builder().idPedido(1).usuario(luis).estado(EstadoPedido.ENVIADO).build();
		Pedido entregado = Pedido.builder().idPedido(2).usuario(luis).estado(EstadoPedido.ENTREGADO).build();
		when(usuarios.findById("luis")).thenReturn(Optional.of(luis));
		when(pedidos.findAllByUsuarioUsernameOrderByCreadoEnDesc("luis")).thenReturn(List.of(enCamino, entregado));

		mvc.perform(delete("/api/admin/usuarios/luis").principal(sesion))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.message")
						.value("Hay pedidos de esta cuenta en curso: se podrá borrar cuando se entreguen o se anulen"));
		verify(usuarios, never()).deleteById(any());

		when(pedidos.findAllByUsuarioUsernameOrderByCreadoEnDesc("luis")).thenReturn(List.of(entregado));
		mvc.perform(delete("/api/admin/usuarios/luis").principal(sesion)).andExpect(status().isNoContent());
		verify(usuarios).deleteById("luis");
		assertThat(entregado.getUsuario()).isNull();
		assertThat(entregado.getNombre()).isEqualTo("Luis Garcia");
		assertThat(entregado.getCorreo()).isEqualTo("luis@reto.com");
		assertThat(entregado.getClaveHash()).hasSize(64);
	}

	@Test
	void aClientDeletesTheirOwnAccountWithTheirPasswordButAnAdministratorCannot() throws Exception {
		Usuario ana = Usuario.builder().username("ana").password(codificador.encode("1234")).nombre("Ana")
				.email("ana@reto.com").perfil(cliente).build();
		Usuario jefa = Usuario.builder().username("admin").password(codificador.encode("1234")).nombre("Admin")
				.email("admin@reto.com").perfil(admin).build();
		when(usuarios.findById("ana")).thenReturn(Optional.of(ana));
		when(usuarios.findById("admin")).thenReturn(Optional.of(jefa));
		MockMvc auth = MockMvcBuilders
				.standaloneSetup(new AuthRestController(
						new UsuarioServiceImpl(usuarios, mock(ReservaRepository.class), pedidos, codificador),
						mock(PerfilService.class), mock(DemoAccountService.class)))
				.setControllerAdvice(new GlobalExceptionHandler()).build();

		auth.perform(delete("/api/auth/me").principal(token("ana")).contentType(MediaType.APPLICATION_JSON)
				.content("{\"password\": \"otra\"}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errores.password").value("La contraseña no es correcta"));
		auth.perform(delete("/api/auth/me").principal(token("admin")).contentType(MediaType.APPLICATION_JSON)
				.content("{\"password\": \"1234\"}"))
				.andExpect(status().isForbidden());
		verify(usuarios, never()).deleteById(any());

		auth.perform(delete("/api/auth/me").principal(token("ana")).contentType(MediaType.APPLICATION_JSON)
				.content("{\"password\": \"1234\"}"))
				.andExpect(status().isNoContent());
		verify(usuarios).deleteById("ana");
	}

	private static UsernamePasswordAuthenticationToken token(String username) {
		return new UsernamePasswordAuthenticationToken(username, null, List.of());
	}

	@Test
	void aRepeatedEmailIsReportedOnItsField() throws Exception {
		when(usuarios.findByEmail("ana@reto.com"))
				.thenReturn(Optional.of(Usuario.builder().username("ana").email("ana@reto.com").build()));

		mvc.perform(post("/api/admin/usuarios").contentType(MediaType.APPLICATION_JSON)
				.content("{\"username\": \"ripley\", \"password\": \"x\", \"email\": \"ana@reto.com\", \"nombre\": \"Ellen\", \"idPerfil\": 2}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errores.email").value("Ya hay otra cuenta con ese correo"));
	}
}
