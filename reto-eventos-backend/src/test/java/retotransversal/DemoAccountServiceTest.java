package retotransversal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import retotransversal.modelo.entities.Perfil;
import retotransversal.modelo.entities.Usuario;
import retotransversal.modelo.repository.UsuarioRepository;
import retotransversal.modelo.service.DemoAccountService;

class DemoAccountServiceTest {
    private final UsuarioRepository repository = mock(UsuarioRepository.class);
    private final org.springframework.security.crypto.password.PasswordEncoder encoder =
        PasswordEncoderFactories.createDelegatingPasswordEncoder();
    private final DemoAccountService service = new DemoAccountService(repository, encoder);

    private Usuario account(String username, String password, int enabled) {
        Perfil perfil = new Perfil();
        perfil.setNombre("ROLE_CLIENTE");
        return Usuario.builder().username(username).email(username + "@reto.com")
            .password(password).enabled(enabled).perfil(perfil).build();
    }

    @Test
    void publishesOnlyExistingDemoAccountsWithVerifiedDefaultPassword() {
        when(repository.findById("ana")).thenReturn(Optional.of(account("ana", encoder.encode("1234"), 1)));
        assertThat(service.availableAccounts()).containsExactly(
            new DemoAccountService.DemoAccount("ana", "1234", "ROLE_CLIENTE"));
        verify(repository, never()).findAll();
        verify(repository).findById("admin");
        verify(repository).findById("ana");
        verify(repository).findById("luis");
        verifyNoMoreInteractions(repository);
    }

    @Test
    void excludesDisabledChangedAndReplacementAccounts() {
        when(repository.findById("admin")).thenReturn(Optional.of(account("admin", "{noop}1234", 0)));
        when(repository.findById("ana")).thenReturn(Optional.of(account("ana", "{noop}changed", 1)));
        Usuario replacement = account("luis", "{noop}1234", 1);
        replacement.setEmail("new-user@example.com");
        when(repository.findById("luis")).thenReturn(Optional.of(replacement));
        assertThat(service.availableAccounts()).isEmpty();
    }
}
