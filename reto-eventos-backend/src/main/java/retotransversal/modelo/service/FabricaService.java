package retotransversal.modelo.service;

import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Clock;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

import javax.sql.DataSource;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.support.EncodedResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.stereotype.Service;

import retotransversal.modelo.service.impl.EventoServiceImpl;

/**
 * Devuelve la demo a su estado de fábrica: borra todo lo que se haya creado o cambiado (sesiones,
 * reservas, cuentas, pedidos, solicitudes, expedientes, fotos...) y carga los datos de
 * {@code fabrica/datos.sql}, los mismos que deja script_bbdd.sql. Todo o nada: si algo falla a medias,
 * la base se queda como estaba.
 *
 * Las sesiones de fábrica se mueven en el calendario para que la primera caiga dentro de un mes, con
 * la misma separación entre ellas: así la demo restaurada siempre tiene programa.
 */
@Service
public class FabricaService {

	private static final Logger log = LoggerFactory.getLogger(FabricaService.class);

	/** Días que faltan, tras restaurar, para la primera sesión del programa. */
	static final int DIAS_HASTA_LA_PRIMERA = 30;

	/** Hijas antes que madres, aunque con las claves ajenas en pausa el orden no es imprescindible. */
	private static final List<String> TABLAS = List.of("lineas_pedido", "pedidos", "productos", "solicitudes",
			"asistentes", "devoluciones", "reservas", "expedientes", "eventos", "usuarios", "tipos_evento", "perfiles", "contacto", "premio",
			"cifra_confianza", "socio");

	private final DataSource dataSource;
	private final ImagenSesionService imagenSesionService;
	private final ExpedienteService expedienteService;
	private final Clock reloj = Clock.system(EventoServiceImpl.ZONA);

	public FabricaService(DataSource dataSource, ImagenSesionService imagenSesionService,
			ExpedienteService expedienteService) {
		this.dataSource = dataSource;
		this.imagenSesionService = imagenSesionService;
		this.expedienteService = expedienteService;
	}

	public void restaurar() {
		try (Connection conexion = dataSource.getConnection()) {
			boolean autocommit = conexion.getAutoCommit();
			conexion.setAutoCommit(false);
			try (Statement sentencia = conexion.createStatement()) {
				sentencia.execute("SET FOREIGN_KEY_CHECKS = 0");
				for (String tabla : TABLAS) {
					sentencia.executeUpdate("DELETE FROM " + tabla);
				}
				ScriptUtils.executeSqlScript(conexion,
						new EncodedResource(new ClassPathResource("fabrica/datos.sql"), StandardCharsets.UTF_8));
				moverSesiones(conexion);
				conexion.commit();
			} catch (SQLException | RuntimeException e) {
				conexion.rollback();
				throw e;
			} finally {
				try (Statement sentencia = conexion.createStatement()) {
					sentencia.execute("SET FOREIGN_KEY_CHECKS = 1");
				}
				conexion.setAutoCommit(autocommit);
			}
			// Los contadores, a continuación de los datos de fábrica (fuera de la transacción: en MariaDB
			// ALTER TABLE confirma por su cuenta).
			try (Statement sentencia = conexion.createStatement()) {
				for (String tabla : TABLAS) {
					sentencia.execute("ALTER TABLE " + tabla + " AUTO_INCREMENT = 1");
				}
			}
		} catch (SQLException e) {
			throw new IllegalStateException("No se ha podido restaurar el estado de fábrica", e);
		}
		imagenSesionService.borrarTodas();
		// Por si los datos de fábrica traen aún las capas antiguas del expediente.
		expedienteService.aplanarCapasAntiguas();
		log.info("Demo restaurada al estado de fábrica");
	}

	private void moverSesiones(Connection conexion) throws SQLException {
		LocalDate primera;
		try (Statement sentencia = conexion.createStatement();
				ResultSet fila = sentencia.executeQuery("SELECT MIN(fecha_inicio) FROM eventos")) {
			primera = fila.next() && fila.getDate(1) != null ? fila.getDate(1).toLocalDate() : null;
		}
		if (primera == null) {
			return;
		}
		long dias = ChronoUnit.DAYS.between(primera, LocalDate.now(reloj).plusDays(DIAS_HASTA_LA_PRIMERA));
		try (PreparedStatement mover = conexion
				.prepareStatement("UPDATE eventos SET fecha_inicio = DATE_ADD(fecha_inicio, INTERVAL ? DAY)")) {
			mover.setLong(1, dias);
			mover.executeUpdate();
		}
	}
}
