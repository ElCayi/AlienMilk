package retotransversal.modelo.service;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.security.crypto.password.PasswordEncoder;
import lombok.RequiredArgsConstructor;
import retotransversal.modelo.repository.UsuarioRepository;

@Service
@RequiredArgsConstructor
public class DemoAccountService {
    private final UsuarioRepository usuarios;
    private final PasswordEncoder passwordEncoder;
    private static final String DEFAULT_PASSWORD = "1234";
    private static final List<String> DEFAULT_USERS = List.of("admin", "ana", "luis");

    public record DemoAccount(String username, String password, String perfil) {}

    public List<DemoAccount> availableAccounts() {
        // Publish only known demo credentials, never stored passwords or new accounts.
        return DEFAULT_USERS.stream()
            .flatMap(username -> usuarios.findById(username).stream())
            .filter(user -> Integer.valueOf(1).equals(user.getEnabled()))
            .filter(user -> (user.getUsername() + "@reto.com").equals(user.getEmail()))
            .filter(user -> user.getPerfil() != null &&
                List.of("ROLE_ADMON", "ROLE_CLIENTE").contains(user.getPerfil().getNombre()))
            .filter(user -> passwordEncoder.matches(DEFAULT_PASSWORD, user.getPassword()))
            .map(user -> new DemoAccount(user.getUsername(), DEFAULT_PASSWORD, user.getPerfil().getNombre()))
            .toList();
    }
}
