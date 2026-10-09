package retotransversal.modelo.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import retotransversal.modelo.entities.Producto;

public interface ProductoRepository extends JpaRepository<Producto, Integer> {

	List<Producto> findAllByActivoTrueOrderByOrdenAsc();

	Optional<Producto> findBySlugAndActivoTrue(String slug);

	List<Producto> findAllBySlugIn(Collection<String> slugs);

	/**
	 * Retira existencias solo si quedan bastantes, en una sola sentencia: dos pedidos simultáneos
	 * no pueden llevarse la misma unidad. Devuelve 0 si no había suficientes.
	 */
	@Modifying
	@Query("update Producto p set p.existencias = p.existencias - :cantidad "
			+ "where p.idProducto = :idProducto and p.existencias >= :cantidad")
	int retirarExistencias(@Param("idProducto") Integer idProducto, @Param("cantidad") int cantidad);

	@Modifying
	@Query("update Producto p set p.existencias = p.existencias + :cantidad where p.idProducto = :idProducto")
	int devolverExistencias(@Param("idProducto") Integer idProducto, @Param("cantidad") int cantidad);
}
