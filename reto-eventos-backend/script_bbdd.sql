CREATE DATABASE IF NOT EXISTS reserva_eventos_bbdd
CHARACTER SET utf8mb4
COLLATE utf8mb4_spanish_ci;

USE reserva_eventos_bbdd;

DROP TABLE IF EXISTS premio;
DROP TABLE IF EXISTS cifra_confianza;
DROP TABLE IF EXISTS socio;
DROP TABLE IF EXISTS contacto;
DROP TABLE IF EXISTS reservas;
DROP TABLE IF EXISTS eventos;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS tipos_evento;
DROP TABLE IF EXISTS perfiles;

CREATE TABLE perfiles (
	id_perfil INT AUTO_INCREMENT PRIMARY KEY,
	nombre VARCHAR(45) NOT NULL UNIQUE
);

CREATE TABLE tipos_evento (
	id_tipo INT AUTO_INCREMENT PRIMARY KEY,
	nombre VARCHAR(45) NOT NULL UNIQUE,
	descripcion VARCHAR(200)
);

CREATE TABLE usuarios (
	username VARCHAR(45) PRIMARY KEY,
	password VARCHAR(90) NOT NULL,
	email VARCHAR(100) NOT NULL UNIQUE,
	nombre VARCHAR(30) NOT NULL,
	apellidos VARCHAR(45),
	direccion VARCHAR(100),
	enabled INT NOT NULL DEFAULT 1,
	fecha_registro DATE,
	id_perfil INT NOT NULL,
	CONSTRAINT fk_usuarios_perfiles
		FOREIGN KEY (id_perfil) REFERENCES perfiles(id_perfil)
);

CREATE TABLE eventos (
	id_evento INT AUTO_INCREMENT PRIMARY KEY,
	nombre VARCHAR(50) NOT NULL,
	descripcion VARCHAR(200),
	fecha_inicio DATE NOT NULL,
	duracion INT,
	direccion VARCHAR(100),
	estado VARCHAR(20) NOT NULL,
	aforo_maximo INT NOT NULL,
	minimo_asistencia INT,
	precio DECIMAL(9,2) NOT NULL,
	id_tipo INT NOT NULL,
	CONSTRAINT fk_eventos_tipos
		FOREIGN KEY (id_tipo) REFERENCES tipos_evento(id_tipo),
	CONSTRAINT ck_eventos_estado
		CHECK (estado IN ('ACTIVO', 'CANCELADO', 'TERMINADO'))
);

CREATE TABLE reservas (
	id_reserva INT AUTO_INCREMENT PRIMARY KEY,
	id_evento INT NOT NULL,
	username VARCHAR(45) NOT NULL,
	precio_venta DECIMAL(9,2) NOT NULL,
	observaciones VARCHAR(200),
	cantidad INT NOT NULL,
	CONSTRAINT fk_reservas_eventos
		FOREIGN KEY (id_evento) REFERENCES eventos(id_evento),
	CONSTRAINT fk_reservas_usuarios
		FOREIGN KEY (username) REFERENCES usuarios(username),
	CONSTRAINT ck_reservas_cantidad
		CHECK (cantidad BETWEEN 1 AND 10)
);

INSERT INTO perfiles (nombre) VALUES
('ROLE_ADMON'),
('ROLE_CLIENTE');

INSERT INTO tipos_evento (nombre, descripcion) VALUES
('CATA_COSMICA', 'Sesiones para probar leche abducida y mezclas interestelares'),
('ABDUCCION_SUAVE', 'Experiencias inmersivas de contacto alienigena aptas para humanos'),
('LABORATORIO_SENSORIAL', 'Talleres secretos de espuma, neon y protocolo AlienMilk'),
('ORBITA_GUIADA', 'Recorridos narrados por hangares, cupulas y zonas de avistamiento');

INSERT INTO usuarios (username, password, email, nombre, apellidos, direccion, enabled, fecha_registro, id_perfil) VALUES
('admin', '{noop}1234', 'admin@reto.com', 'Administrador', 'Principal', 'Avenida Central 1', 1, '2026-03-31', 1),
('ana', '{noop}1234', 'ana@reto.com', 'Ana', 'Lopez', 'Calle Mayor 12', 1, '2026-03-31', 2),
('luis', '{noop}1234', 'luis@reto.com', 'Luis', 'Garcia', 'Calle Sol 8', 1, '2026-03-31', 2);

INSERT INTO eventos (nombre, descripcion, fecha_inicio, duracion, direccion, estado, aforo_maximo, minimo_asistencia, precio, id_tipo) VALUES
('Cata de Leche Abducida', 'Sesion inaugural para probar la cosecha lactea recuperada en la orbita de Orion', '2026-05-20', 120, 'Hangar 7', 'ACTIVO', 200, 50, 35.00, 1),
('Abduccion Suave para Principiantes', 'Experiencia guiada con luces bajas, humo y protocolo de bienvenida interplanetaria', '2026-05-28', 100, 'Cupula Beta', 'ACTIVO', 120, 30, 22.50, 2),
('Taller de Espuma Galactica', 'Laboratorio practico para preparar mezclas AlienMilk con textura cosmica', '2026-06-10', 150, 'Modulo Lacteo 3', 'ACTIVO', 60, 20, 55.00, 3),
('Ruta Nocturna por el Hangar', 'Recorrido guiado por las zonas donde se conserva el primer lote de leche abducida', '2026-05-18', 90, 'Acceso Norte del Hangar', 'ACTIVO', 40, 10, 12.00, 4),
('Sesion Eclipse Lunar', 'Sesion especial en la cupula de ordeño lunar con ambientacion inmersiva y cata nocturna', '2026-07-01', 180, 'Cupula Eclipse', 'ACTIVO', 500, 100, 48.00, 1);

INSERT INTO reservas (id_evento, username, precio_venta, observaciones, cantidad) VALUES
(1, 'ana', 70.00, 'Queremos mesa cerca del lacteobar', 2),
(1, 'luis', 105.00, 'Preferimos la zona de vision panoramica', 3),
(2, 'ana', 22.50, 'Si puede ser, sin destellos muy fuertes', 1),
(4, 'luis', 24.00, 'Reserva historica de ejemplo AlienMilk', 2);

-- Ficha de contacto (misma definición que migraciones/2026-09-26-contacto.sql).
CREATE TABLE IF NOT EXISTS contacto (
	id_contacto INT PRIMARY KEY,
	nombre_sede VARCHAR(80) NOT NULL,
	direccion VARCHAR(120) NOT NULL,
	ciudad VARCHAR(80) NOT NULL,
	email VARCHAR(100) NOT NULL,
	telefono VARCHAR(30),
	dias_apertura VARCHAR(20) NOT NULL,
	hora_apertura TIME NOT NULL,
	hora_cierre TIME NOT NULL,
	zona_horaria VARCHAR(40) NOT NULL,
	como_llegar VARCHAR(300),
	condiciones_acceso VARCHAR(300),
	actualizado_en DATETIME,
	actualizado_por VARCHAR(45),
	CONSTRAINT ck_contacto_ficha_unica CHECK (id_contacto = 1)
);

INSERT IGNORE INTO contacto (id_contacto, nombre_sede, direccion, ciudad, email, telefono, dias_apertura,
	hora_apertura, hora_cierre, zona_horaria, como_llegar, condiciones_acceso) VALUES
(1, 'Base central', 'Hangar 7, Cúpula Central', 'Madrid', 'contacto@alienmilksessions.com', '+34 910 000 777',
	'4,5,6,7', '18:00', '23:30', 'Europe/Madrid',
	'Metro línea 7, parada Cúpula. Desde la salida norte, siga la señalización hasta el Hangar 7. Los días de sesión, una lanzadera recoge a los participantes en la parada desde una hora antes de la apertura.',
	'Acceso para mayores de 18 años con reserva confirmada o invitación nominal. Se ruega llegar con quince minutos de antelación y no haber consumido lácteos terrestres en las tres horas previas.');

-- La sede central se traslada a A Coruña (SOL-III): nombre, dirección, teléfono, cómo llegar y
-- condiciones de acceso.
-- Idempotente y prudente: solo cambia la ficha si todavía conserva los datos originales de
-- Madrid, para no pisar lo que se haya editado desde el panel de administración.

UPDATE contacto SET
	nombre_sede = 'Nodo central · Tierra',
	direccion = 'Hangar 7, Cúpula Atlántica',
	ciudad = 'A Coruña',
	telefono = '+34 981 000 777',
	como_llegar = 'La sede se encuentra en A Coruña, SOL-III. Los visitantes que viajen con Renfe deberán preveer margen adicional; pues sus trenes funcionan como la puta mierda y nunca llegan a su hora.',
	condiciones_acceso = 'SOL-III mantiene una gravedad superficial próxima a 1 g y una atmósfera de nitrógeno y oxígeno. Recomendamos encarecidamente consultar el catálogo de soportes vitales permitidos.'
WHERE id_contacto = 1
	AND direccion = 'Hangar 7, Cúpula Central'
	AND ciudad = 'Madrid';

-- Calle y código postal, aparte del nombre del recinto (`direccion`).
ALTER TABLE contacto
	ADD COLUMN IF NOT EXISTS calle VARCHAR(120) AFTER direccion,
	ADD COLUMN IF NOT EXISTS codigo_postal VARCHAR(10) AFTER calle;

UPDATE contacto SET
	calle = 'Rúa dos Vixías, 12',
	codigo_postal = '15002'
WHERE id_contacto = 1
	AND ciudad = 'A Coruña'
	AND calle IS NULL
	AND codigo_postal IS NULL;

-- Red de confianza de la portada (misma definición que migraciones/2026-10-07-red-confianza.sql).
CREATE TABLE IF NOT EXISTS socio (
	id_socio INT AUTO_INCREMENT PRIMARY KEY,
	nombre VARCHAR(80) NOT NULL UNIQUE,
	estilo VARCHAR(12) NOT NULL,
	emblema VARCHAR(30) NOT NULL,
	orden INT NOT NULL DEFAULT 0,
	activo BOOLEAN NOT NULL DEFAULT TRUE,
	CONSTRAINT ck_socio_estilo CHECK (estilo IN ('serif', 'condensed', 'wide', 'italic'))
);

-- calculo: NULL, el valor tal cual; 'ANIOS_DESDE', los años transcurridos desde el año guardado
-- en valor (así «Continuidad» crece sola cada enero).
CREATE TABLE IF NOT EXISTS cifra_confianza (
	id_cifra INT AUTO_INCREMENT PRIMARY KEY,
	clave VARCHAR(40) NOT NULL UNIQUE,
	rotulo VARCHAR(40) NOT NULL,
	valor VARCHAR(20) NOT NULL,
	unidad VARCHAR(20),
	nota VARCHAR(80),
	calculo VARCHAR(20),
	orden INT NOT NULL DEFAULT 0,
	CONSTRAINT ck_cifra_calculo CHECK (calculo IS NULL OR calculo IN ('ANIOS_DESDE'))
);

INSERT IGNORE INTO socio (nombre, estilo, emblema, orden) VALUES
('Cooperativa Láctea de Ceto IV', 'serif', 'gota', 1),
('Hostelería Orbital', 'condensed', 'campana', 2),
('Grupo Meridiana', 'wide', 'globo', 3),
('Ultramarinos Kepler', 'italic', 'planeta', 4),
('Fundación Proxima', 'serif', 'estrellas', 5),
('Transportes Halley', 'condensed', 'cometa', 6),
('Casa Vesta', 'wide', 'hogar', 7),
('Mesón Andrómeda', 'italic', 'espiral', 8),
('Federación de Catadores de Tau Ceti', 'serif', 'copa', 9),
('Frío Gliese', 'condensed', 'cristal', 10);

INSERT IGNORE INTO cifra_confianza (clave, rotulo, valor, unidad, nota, calculo, orden) VALUES
('continuidad', 'Continuidad', '1809', 'años', 'Sin interrupción operativa', 'ANIOS_DESDE', 1),
('cobertura', 'Cobertura', '83', 'sistemas', '3 regiones galácticas', NULL, 2),
('linajes', 'Linajes custodiados', '18.642', NULL, 'Y creciendo', NULL, 3),
('filtraciones', 'Filtraciones de origen', '0', NULL, 'En más de dos siglos', NULL, 4);

CREATE TABLE IF NOT EXISTS premio (
	id_premio INT AUTO_INCREMENT PRIMARY KEY,
	sigla VARCHAR(12) NOT NULL,
	nombre VARCHAR(80) NOT NULL UNIQUE,
	otorgante VARCHAR(100) NOT NULL,
	fecha VARCHAR(30) NOT NULL,
	orden INT NOT NULL DEFAULT 0,
	activo BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT IGNORE INTO premio (sigla, nombre, otorgante, fecha, orden) VALUES
('CCSL', 'Distinción de Custodia Continuada', 'Consejo de Custodia de los Sistemas Locales', 'Renovada desde 1962', 1),
('CEE', 'Premio al Descubrimiento de Nuevas Formas de Entretenimiento Exótico', 'Círculo de Experiencias Extraordinarias', '1849', 2),
('CSH', 'Mención a la Hospitalidad Interespecie', 'Consejo de Salones y Hospedajes', '1897', 3),
('CMR', 'Certificación de Custodia de Información · Grado Militar', 'Cámara de Resiliencia y Seguridad', '1934', 4),
('FEN', 'Premio a la Innovación Sensorial Aplicada', 'Foro de Experiencias No Convencionales', '1968', 5),
('AFC', 'Miembro honorífico Furrfestigal', 'Aso. FurriCompostela', '1991', 6),
('CEA', 'Top Circuito de Experiencias para Adultos', 'Confederación de Espacios Alternativos', '2014', 7),
('SWX', 'Mención Especial en Programación Swinger Interespecie', 'Salón SWX', '2021', 8),
('VANTA', 'OnlyMilk', 'VANTA Alta Intensidad Sensorial', '2025', 9);
