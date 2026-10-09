package retotransversal.modelo.entities;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

/** Pedido de la tienda. Los importes se calculan en el servidor y se guardan tal como se cobraron. */
@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
@Entity
@Table(name = "pedidos")
public class Pedido {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "id_pedido")
	private Integer idPedido;

	/** Número que ve el cliente: AMD (AlienMilk Distribución), año e id. */
	@Column(unique = true, length = 20)
	private String referencia;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "username", nullable = false)
	@ToString.Exclude
	@EqualsAndHashCode.Exclude
	private Usuario usuario;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 12)
	private EstadoPedido estado;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 12)
	private EntregaPedido entrega;

	@Column(length = 200)
	private String direccion;

	@Column(nullable = false, precision = 9, scale = 2)
	private BigDecimal subtotal;

	@Column(name = "gastos_envio", nullable = false, precision = 9, scale = 2)
	private BigDecimal gastosEnvio;

	@Column(nullable = false, precision = 9, scale = 2)
	private BigDecimal total;

	@Column(name = "creado_en", nullable = false)
	private LocalDateTime creadoEn;

	@Column(name = "anulado_en")
	private LocalDateTime anuladoEn;

	@Builder.Default
	@OneToMany(mappedBy = "pedido", cascade = CascadeType.ALL, orphanRemoval = true)
	@OrderBy("idLinea")
	@ToString.Exclude
	@EqualsAndHashCode.Exclude
	private List<LineaPedido> lineas = new ArrayList<>();

	public void agregarLinea(LineaPedido linea) {
		linea.setPedido(this);
		lineas.add(linea);
	}
}
