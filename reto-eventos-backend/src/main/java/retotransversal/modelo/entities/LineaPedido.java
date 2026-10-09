package retotransversal.modelo.entities;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

/**
 * Línea de un pedido. Nombre y precio se copian del producto al confirmar: si el catálogo cambia
 * después, el pedido sigue diciendo lo que se compró y a qué precio.
 */
@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
@Entity
@Table(name = "lineas_pedido")
public class LineaPedido {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "id_linea")
	private Integer idLinea;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "id_pedido", nullable = false)
	@ToString.Exclude
	@EqualsAndHashCode.Exclude
	private Pedido pedido;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "id_producto", nullable = false)
	@ToString.Exclude
	@EqualsAndHashCode.Exclude
	private Producto producto;

	@Column(nullable = false, length = 80)
	private String nombre;

	@Column(name = "precio_unitario", nullable = false, precision = 9, scale = 2)
	private BigDecimal precioUnitario;

	@Column(nullable = false)
	private Integer cantidad;

	@Column(nullable = false, precision = 9, scale = 2)
	private BigDecimal importe;
}
