package retotransversal.modelo.entities;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Producto de la tienda. El precio y las existencias de aquí son los únicos que cuentan: el pedido
 * los vuelve a leer al confirmarse, aunque el carrito del navegador diga otra cosa.
 */
@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
@Entity
@Table(name = "productos")
public class Producto {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "id_producto")
	private Integer idProducto;

	/** Dirección de la ficha (/tienda/leche-entera-ceto) y clave del producto en el carrito. */
	@Column(nullable = false, unique = true, length = 60)
	private String slug;

	@Column(nullable = false, length = 80)
	private String nombre;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 12)
	private CategoriaProducto categoria;

	/** Una línea para el catálogo; la descripción completa va en la ficha. */
	@Column(nullable = false, length = 160)
	private String resumen;

	@Column(nullable = false, columnDefinition = "TEXT")
	private String descripcion;

	@Column(nullable = false, length = 120)
	private String procedencia;

	/** Volumen, peso o tamaño, tal como figura en la etiqueta: 750 ml, 250 g, 312 páginas. */
	@Column(nullable = false, length = 40)
	private String formato;

	@Column(nullable = false, length = 20)
	private String lote;

	@Column(nullable = false, length = 200)
	private String conservacion;

	@Column(nullable = false, length = 160)
	private String distribucion;

	@Column(length = 200)
	private String advertencia;

	@Column(nullable = false, precision = 9, scale = 2)
	private BigDecimal precio;

	@Column(nullable = false)
	private Integer existencias;

	/** Color de la muestra en el frontend (nacar, glaciar, liquen…); no es un dato de negocio. */
	@Column(nullable = false, length = 12)
	private String tono;

	@Builder.Default
	@Column(nullable = false)
	private Integer orden = 0;

	@Builder.Default
	@Column(nullable = false)
	private Boolean activo = true;
}
