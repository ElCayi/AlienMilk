CREATE DATABASE IF NOT EXISTS reserva_eventos_bbdd
CHARACTER SET utf8mb4
COLLATE utf8mb4_spanish_ci;

USE reserva_eventos_bbdd;

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
