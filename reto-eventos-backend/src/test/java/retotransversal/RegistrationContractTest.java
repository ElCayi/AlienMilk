package retotransversal;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import retotransversal.modelo.entities.Perfil;
import retotransversal.modelo.service.DemoAccountService;
import retotransversal.modelo.service.PerfilService;
import retotransversal.modelo.service.UsuarioService;
import retotransversal.restcontroller.AuthRestController;

class RegistrationContractTest {
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        UsuarioService users = mock(UsuarioService.class);
        PerfilService profiles = mock(PerfilService.class);
        Perfil client = new Perfil();
        client.setNombre("ROLE_CLIENTE");
        when(profiles.findByNombre("ROLE_CLIENTE")).thenReturn(client);
        when(users.insertOne(any())).thenAnswer(call -> call.getArgument(0));
        mvc = MockMvcBuilders.standaloneSetup(
            new AuthRestController(users, profiles, mock(DemoAccountService.class))).build();
    }

    @ParameterizedTest
    @CsvSource({
        "visitante, visitante",
        "abcdefghijklmnopqrstuvwxyz1234567890, abcdefghijklmnopqrstuvwxyz1234"
    })
    void acceptsTheThreeFieldFormAndSuppliesANameThatFitsTheDatabase(String username, String name)
            throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"username":"%s","email":"visitor@example.invalid","password":"test-password"}
                """.formatted(username)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.username").value(username))
            .andExpect(jsonPath("$.nombre").value(name))
            .andExpect(jsonPath("$.perfil").value("ROLE_CLIENTE"))
            .andExpect(jsonPath("$.password").doesNotExist());
    }

    @Test
    void keepsAnExplicitNameFromExistingClients() throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"username":"visitante","email":"visitor@example.invalid",
                 "password":"test-password","nombre":"Nombre elegido"}
                """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.nombre").value("Nombre elegido"));
    }
}
