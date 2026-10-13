package retotransversal.modelo.service.impl;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import retotransversal.exception.GlobalExceptionHandler;
import retotransversal.modelo.entities.EstadoEvento;
import retotransversal.modelo.entities.Evento;
import retotransversal.modelo.entities.Perfil;
import retotransversal.modelo.entities.Reserva;
import retotransversal.modelo.entities.TipoEvento;
import retotransversal.modelo.entities.Usuario;
import retotransversal.modelo.repository.EventoRepository;
import retotransversal.modelo.repository.PerfilRepository;
import retotransversal.modelo.repository.ReservaRepository;
import retotransversal.modelo.repository.TipoEventoRepository;
import retotransversal.modelo.repository.UsuarioRepository;
import retotransversal.modelo.service.EventoService;
import retotransversal.modelo.service.UsuarioService;
import retotransversal.restcontroller.PerfilRestController;
import retotransversal.restcontroller.ReservaRestController;
import retotransversal.restcontroller.TipoEventoRestController;

/** Tipos, perfiles y reservas: lo que está en uso no se borra y lo que es historial no se cancela. */
class AdminCatalogosTest {

	private final TipoEventoRepository tipos = mock(TipoEventoRepository.class);
	private final EventoRepository eventos = mock(EventoRepository.class);
	private final PerfilRepository perfiles = mock(PerfilRepository.class);
	private final UsuarioRepository usuarios = mock(UsuarioRepository.class);

	private final MockMvc tiposMvc = MockMvcBuilders
			.standaloneSetup(new TipoEventoRestController(new TipoEventoServiceImpl(tipos, eventos)))
			.setControllerAdvice(new GlobalExceptionHandler()).build();
	private final MockMvc perfilesMvc = MockMvcBuilders
			.standaloneSetup(new PerfilRestController(new PerfilServiceImpl(perfiles, usuarios)))
			.setControllerAdvice(new GlobalExceptionHandler()).build();

	@Test
	void aTypeInUseIsNotDeletedAndTheListSaysHowMuchItIsUsed() throws Exception {
		TipoEvento cata = TipoEvento.builder().idTipo(1).nombre("CATA_COSMICA").build();
		when(tipos.findAll()).thenReturn(List.of(cata));
		when(tipos.findById(1)).thenReturn(Optional.of(cata));
		when(eventos.countByTipoEventoIdTipo(1)).thenReturn(2L);

		tiposMvc.perform(get("/api/admin/tipos-evento"))
				.andExpect(jsonPath("$[0].sesiones").value(2));
		tiposMvc.perform(delete("/api/admin/tipos-evento/1"))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.message").value("Hay 2 sesiones de este tipo: cámbialas de tipo antes de borrarlo"));
		verify(tipos, never()).deleteById(any());
	}

	@Test
	void twoTypesCannotShareAName() throws Exception {
		when(tipos.findByNombre("CATA_COSMICA"))
				.thenReturn(Optional.of(TipoEvento.builder().idTipo(1).nombre("CATA_COSMICA").build()));

		tiposMvc.perform(post("/api/admin/tipos-evento").contentType(MediaType.APPLICATION_JSON)
				.content("{\"nombre\": \" CATA_COSMICA \"}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errores.nombre").value("Ya hay un tipo con ese nombre"));
	}

	@Test
	void theSystemProfilesCannotBeRenamedOrDeleted() throws Exception {
		Perfil admin = Perfil.builder().idPerfil(1).nombre("ROLE_ADMON").build();
		when(perfiles.findAll()).thenReturn(List.of(admin));
		when(perfiles.findById(1)).thenReturn(Optional.of(admin));
		when(usuarios.countByPerfilIdPerfil(1)).thenReturn(1L);

		perfilesMvc.perform(get("/api/admin/perfiles"))
				.andExpect(jsonPath("$[0].sistema").value(true))
				.andExpect(jsonPath("$[0].usuarios").value(1));
		perfilesMvc.perform(put("/api/admin/perfiles/1").contentType(MediaType.APPLICATION_JSON)
				.content("{\"nombre\": \"ROLE_JEFE\"}"))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.message").value("Es un perfil del sistema: no se puede renombrar"));
		perfilesMvc.perform(delete("/api/admin/perfiles/1"))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.message").value("Es un perfil del sistema: no se puede borrar"));
		verify(perfiles, never()).save(any());
		verify(perfiles, never()).deleteById(any());
	}

	@Test
	void anotherProfileGoesOnlyWhenNobodyHasIt() throws Exception {
		Perfil editor = Perfil.builder().idPerfil(3).nombre("ROLE_EDITOR").build();
		when(perfiles.findById(3)).thenReturn(Optional.of(editor));
		when(usuarios.countByPerfilIdPerfil(3)).thenReturn(2L);

		perfilesMvc.perform(delete("/api/admin/perfiles/3"))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.message").value("2 cuentas tienen este perfil: cámbiales el perfil antes de borrarlo"));

		when(usuarios.countByPerfilIdPerfil(3)).thenReturn(0L);
		perfilesMvc.perform(delete("/api/admin/perfiles/3")).andExpect(status().isNoContent());
		verify(perfiles).deleteById(3);
	}

	@Test
	void aClientKeepsTheReservationsOfASessionThatIsNoLongerActive() throws Exception {
		ReservaRepository reservas = mock(ReservaRepository.class);
		Usuario ana = Usuario.builder().username("ana").build();
		Evento cancelada = Evento.builder().idEvento(4).estado(EstadoEvento.CANCELADO).build();
		Evento activa = Evento.builder().idEvento(5).estado(EstadoEvento.ACTIVO).build();
		when(reservas.findById(10)).thenReturn(Optional.of(Reserva.builder().idReserva(10).usuario(ana).evento(cancelada).build()));
		when(reservas.findById(11)).thenReturn(Optional.of(Reserva.builder().idReserva(11).usuario(ana).evento(activa).build()));
		MockMvc mvc = MockMvcBuilders
				.standaloneSetup(new ReservaRestController(
						new ReservaServiceImpl(reservas, mock(EventoService.class), mock(UsuarioService.class))))
				.setControllerAdvice(new GlobalExceptionHandler()).build();

		mvc.perform(delete("/api/reservas/10").principal(ana()))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.message").value("La sesión ya no está activa: la reserva se queda en tu historial"));
		mvc.perform(delete("/api/reservas/11").principal(ana())).andExpect(status().isNoContent());
		verify(reservas, never()).deleteById(10);
		verify(reservas).deleteById(11);
	}

	private static UsernamePasswordAuthenticationToken ana() {
		return new UsernamePasswordAuthenticationToken("ana", null, List.of());
	}
}
