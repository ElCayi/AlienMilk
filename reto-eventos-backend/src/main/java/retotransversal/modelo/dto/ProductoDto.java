package retotransversal.modelo.dto;

import java.math.BigDecimal;

import retotransversal.modelo.entities.CategoriaProducto;
import retotransversal.modelo.entities.Producto;

/** Producto tal como lo ven el catálogo y la ficha. */
public record ProductoDto(
		String slug,
		String nombre,
		CategoriaProducto categoria,
		String resumen,
		String descripcion,
		String procedencia,
		String formato,
		String lote,
		String conservacion,
		String distribucion,
		String advertencia,
		BigDecimal precio,
		int existencias,
		String tono) {

	public static ProductoDto fromEntity(Producto producto) {
		return new ProductoDto(producto.getSlug(), producto.getNombre(), producto.getCategoria(),
				producto.getResumen(), producto.getDescripcion(), producto.getProcedencia(), producto.getFormato(),
				producto.getLote(), producto.getConservacion(), producto.getDistribucion(), producto.getAdvertencia(),
				producto.getPrecio(), producto.getExistencias(), producto.getTono());
	}
}
