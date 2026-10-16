package retotransversal.modelo.entities;

import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
@Entity
@Table(name = "usuarios")
public class Usuario {

	@Id
	@Column(length = 45)
	private String username;

	@Column(nullable = false, length = 90)
	private String password;

	@Column(nullable = false, unique = true, length = 100)
	private String email;

	@Column(nullable = false, length = 30)
	private String nombre;

	@Column(length = 45)
	private String apellidos;

	@Column(length = 100)
	private String direccion;

	@Builder.Default
	private Integer enabled = 1;

	/** Si quiere recibir el programa de AlienMilk Sessions: se marca aparte, nunca por defecto. */
	@Builder.Default
	@Column(name = "acepta_comunicaciones", nullable = false)
	private boolean aceptaComunicaciones = false;

	@Column(name = "fecha_registro")
	private LocalDate fechaRegistro;

	@ManyToOne(fetch = FetchType.EAGER)
	@JoinColumn(name = "id_perfil", nullable = false)
	private Perfil perfil;
}
