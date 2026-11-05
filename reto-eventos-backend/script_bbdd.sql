CREATE DATABASE IF NOT EXISTS reserva_eventos_bbdd
CHARACTER SET utf8mb4
COLLATE utf8mb4_spanish_ci;

USE reserva_eventos_bbdd;

DROP TABLE IF EXISTS premio;
DROP TABLE IF EXISTS cifra_confianza;
DROP TABLE IF EXISTS socio;

DROP TABLE IF EXISTS lineas_pedido;
DROP TABLE IF EXISTS pedidos;
DROP TABLE IF EXISTS productos;
DROP TABLE IF EXISTS solicitudes;
DROP TABLE IF EXISTS contacto;
DROP TABLE IF EXISTS devoluciones;
DROP TABLE IF EXISTS reservas;
DROP TABLE IF EXISTS expedientes;
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
	acepta_comunicaciones BOOLEAN NOT NULL DEFAULT FALSE,
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
	hora_inicio TIME NOT NULL,
	duracion INT,
	direccion VARCHAR(100),
	estado VARCHAR(20) NOT NULL,
	aforo_maximo INT NOT NULL,
	minimo_asistencia INT,
	precio DECIMAL(9,2) NOT NULL,
	imagen VARCHAR(80),
	archivada BOOLEAN NOT NULL DEFAULT FALSE,
	id_tipo INT NOT NULL,
	CONSTRAINT fk_eventos_tipos
		FOREIGN KEY (id_tipo) REFERENCES tipos_evento(id_tipo),
	CONSTRAINT ck_eventos_estado
		CHECK (estado IN ('ACTIVO', 'CANCELADO', 'TERMINADO'))
);

CREATE TABLE reservas (
	id_reserva INT AUTO_INCREMENT PRIMARY KEY,
	id_evento INT NOT NULL,
	-- Sin cuenta (por teléfono, o de una cuenta borrada): a nombre de cliente_nombre
	-- (migraciones/2026-10-17-reservas-sin-cuenta.sql).
	username VARCHAR(45),
	cliente_nombre VARCHAR(120),
	cliente_correo VARCHAR(120),
	precio_venta DECIMAL(9,2) NOT NULL,
	observaciones VARCHAR(200),
	cantidad INT NOT NULL,
	telefono VARCHAR(20),
	adaptaciones VARCHAR(500),
	material_externo BOOLEAN NOT NULL DEFAULT FALSE,
	material_descripcion VARCHAR(500),
	conformidad_en DATETIME,
	-- La revisión de adaptaciones y material (migraciones/2026-10-17-revision.sql): null, sin revisar.
	revision_aceptada BOOLEAN,
	revision_nota VARCHAR(300),
	revisada_en DATETIME,
	-- Cancelar no borra (migraciones/2026-10-17-reservas-cancelacion.sql).
	cancelada_en DATETIME,
	cancelada_por VARCHAR(20),
	motivo_cancelacion VARCHAR(200),
	-- El cobro (migraciones/2026-10-17-reservas-pago.sql): ver EstadoPago.
	estado_pago VARCHAR(20) NOT NULL DEFAULT 'PAGADA',
	pago_sesion VARCHAR(100),
	pago_url VARCHAR(500),
	pago_caduca_en DATETIME,
	pago_id VARCHAR(100),
	pagada_en DATETIME,
	importe_devuelto DECIMAL(9,2) NOT NULL DEFAULT 0,
	-- Control de ingreso de las reservas sin registrar (migraciones/2026-10-17-control-ingreso.sql).
	entradas_sin_registrar INT NOT NULL DEFAULT 0,
	INDEX ix_reservas_pago_sesion (pago_sesion),
	CONSTRAINT fk_reservas_eventos
		FOREIGN KEY (id_evento) REFERENCES eventos(id_evento),
	CONSTRAINT fk_reservas_usuarios
		FOREIGN KEY (username) REFERENCES usuarios(username),
	CONSTRAINT ck_reservas_cantidad
		CHECK (cantidad BETWEEN 1 AND 10)
);

-- Registro de asistencia: un participante por plaza (migraciones/2026-10-16-reservas-asistencia.sql).
CREATE TABLE asistentes (
	id_asistente INT AUTO_INCREMENT PRIMARY KEY,
	id_reserva INT NOT NULL,
	orden INT NOT NULL,
	nombre VARCHAR(80) NOT NULL,
	credencial VARCHAR(30) NOT NULL,
	procedencia VARCHAR(80),
	incompatibilidades VARCHAR(300),
	-- Cuándo pasó el control de ingreso (migraciones/2026-10-17-control-ingreso.sql).
	entrada_en DATETIME,
	CONSTRAINT fk_asistentes_reservas
		FOREIGN KEY (id_reserva) REFERENCES reservas(id_reserva) ON DELETE CASCADE
);

-- Cada devolución con su registro (migraciones/2026-10-17-devoluciones.sql).
CREATE TABLE devoluciones (
	id_devolucion INT AUTO_INCREMENT PRIMARY KEY,
	id_reserva INT NOT NULL,
	importe DECIMAL(9,2) NOT NULL,
	medio VARCHAR(10) NOT NULL,
	estado VARCHAR(10) NOT NULL,
	motivo VARCHAR(120) NOT NULL,
	referencia VARCHAR(100),
	creada_en DATETIME NOT NULL,
	hecha_en DATETIME,
	CONSTRAINT fk_devoluciones_reservas
		FOREIGN KEY (id_reserva) REFERENCES reservas(id_reserva) ON DELETE CASCADE
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

INSERT INTO eventos (nombre, descripcion, fecha_inicio, hora_inicio, duracion, direccion, estado, aforo_maximo, minimo_asistencia, precio, id_tipo) VALUES
('Cata de Leche Abducida', 'Sesion inaugural para probar la cosecha lactea recuperada en la orbita de Orion', '2026-11-20', '19:15', 150, 'Hangar 7', 'ACTIVO', 200, 50, 35.00, 1),
('Abduccion Suave para Principiantes', 'Experiencia guiada con luces bajas, humo y protocolo de bienvenida interplanetaria', '2026-11-28', '18:30', 130, 'Cupula Beta', 'ACTIVO', 120, 30, 22.50, 2),
('Taller de Espuma Galactica', 'Laboratorio practico para preparar mezclas AlienMilk con textura cosmica', '2026-12-10', '17:30', 165, 'Modulo Lacteo 3', 'ACTIVO', 60, 20, 55.00, 3),
('Ruta Nocturna por el Hangar', 'Recorrido guiado por las zonas donde se conserva el primer lote de leche abducida', '2026-11-18', '22:30', 105, 'Acceso Norte del Hangar', 'ACTIVO', 40, 10, 12.00, 4),
('Sesion Eclipse Lunar', 'Sesion especial en la cupula de ordeño lunar con ambientacion inmersiva y cata nocturna', '2027-01-01', '21:00', 170, 'Cupula Eclipse', 'ACTIVO', 500, 100, 48.00, 1);

INSERT INTO reservas (id_evento, username, precio_venta, observaciones, cantidad, telefono, adaptaciones, material_externo, material_descripcion, conformidad_en, cancelada_en, cancelada_por, motivo_cancelacion, estado_pago, pagada_en, importe_devuelto) VALUES
(1, 'ana', 70.00, 'Queremos mesa cerca del lacteobar', 2, '+34 600 123 456', NULL, FALSE, NULL, '2026-10-01 18:20:00', NULL, NULL, NULL, 'PAGADA', '2026-10-01 18:21:00', 0),
(1, 'luis', 105.00, 'Preferimos la zona de vision panoramica', 3, '+34 611 987 654', 'Uno de los participantes necesita penumbra durante toda la sesión.', FALSE, NULL, '2026-10-02 10:05:00', NULL, NULL, NULL, 'PAGADA', '2026-10-02 10:07:00', 0),
(2, 'ana', 22.50, 'Si puede ser, sin destellos muy fuertes', 1, NULL, NULL, FALSE, NULL, NULL, NULL, NULL, NULL, 'EN_TAQUILLA', NULL, 0),
(4, 'luis', 24.00, 'Reserva historica de ejemplo AlienMilk', 2, '+34 611 987 654', NULL, TRUE, 'Respirador de metano portátil, homologado en Titán.', '2026-10-03 21:40:00', NULL, NULL, NULL, 'PAGADA', '2026-10-03 21:42:00', 0),
-- Dos canceladas: cancelar no borra, la reserva se queda con quién, cuándo y por qué.
(3, 'ana', 55.00, NULL, 1, '+34 600 123 456', NULL, FALSE, NULL, '2026-10-04 11:30:00', '2026-10-09 09:12:00', 'CLIENTE', NULL, 'PAGADA', '2026-10-04 11:31:00', 55.00),
(5, 'luis', 96.00, 'Tomada por teléfono', 2, '+34 611 987 654', NULL, FALSE, NULL, NULL, '2026-10-12 17:45:00', 'ALIENMILK', 'Duplicada: volvió a reservar desde la web con los participantes.', 'EN_TAQUILLA', NULL, 0);

-- La 5 (cancelada por Ana) se devolvió a su tarjeta.
INSERT INTO devoluciones (id_reserva, importe, medio, estado, motivo, creada_en, hecha_en) VALUES
(5, 55.00, 'TARJETA', 'HECHA', 'Cancelación del cliente', '2026-10-09 09:12:00', '2026-10-09 09:12:00');

-- La 2 ya está revisada; la 4 (material externo) sigue pendiente.
UPDATE reservas SET revision_aceptada = TRUE, revision_nota = 'Le reservamos una butaca en la fila de penumbra, junto al pasillo.',
	revisada_en = '2026-10-03 09:30:00' WHERE id_reserva = 2;

-- La reserva 3 se tomó por teléfono, antes del registro de asistencia: sus participantes quedan sin
-- registrar y se paga en taquilla.
INSERT INTO asistentes (id_reserva, orden, nombre, credencial, procedencia, incompatibilidades) VALUES
(1, 1, 'Ana Lopez', 'DNI_NIE', 'Madrid, SOL-III', NULL),
(1, 2, 'Mara Ishikawa', 'DNI_NIE', 'Madrid, SOL-III', 'Lactosa terrestre'),
(2, 1, 'Luis Garcia', 'DNI_NIE', 'Madrid, SOL-III', NULL),
(2, 2, 'Kael-9 Varo', 'CREDENCIAL_TRANSITO', 'Galileo Regio, Ganímedes', 'No tolera la luz ultravioleta'),
(2, 3, 'Ingrid Solveig', 'PASAPORTE', 'Tromsø, SOL-III', NULL),
(4, 1, 'Luis Garcia', 'DNI_NIE', 'Madrid, SOL-III', NULL),
(4, 2, 'Lhenna Quo', 'CREDENCIAL_TRANSITO', 'Orilla de Kraken Mare, Titán', 'Muestras con actividad residual'),
(5, 1, 'Ana Lopez', 'DNI_NIE', 'Madrid, SOL-III', NULL);

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
('CATL', 'Premio al Entretenimiento Exótico', 'Confederación para el Avance del Tiempo Libre', '1849', 2),
('CSH', 'Mención a la Hospitalidad Interespecie', 'Consejo de Salones y Hospedajes', '1897', 3),
('CMR', 'Certificación de Resiliencia Informacional · Grado Militar', 'Cámara de Resiliencia y Seguridad', '1934', 4),
('FEN', 'Premio a la Innovación Sensorial Aplicada', 'Foro de Experiencias No Convencionales', '1968', 5),
('AFC', 'Miembro honorífico Furrfestigal', 'Aso. FurriCompostela', '1991', 6),
('GV', 'Colección de Orígenes Remotos', 'Galerías Vesta', '2014', 7),
('SWX', 'Mención Especial en Programación Swinger', 'Salón SWX', '2021', 8),
('OF', 'Club del Millón · OnlyMilk', 'OnlyFans', '2025', 9);

-- El texto que se despliega con el (+) de la destacada. ADD COLUMN IF NOT EXISTS y UPDATE: también
-- vale para las bases que ya tenían la tabla.
ALTER TABLE premio ADD COLUMN IF NOT EXISTS descripcion VARCHAR(600) NULL AFTER fecha;

UPDATE premio SET descripcion = 'Se concede a quien custodia sin interrupción muestras de origen no declarado. AlienMilk la recibió en 1962 y la ha renovado en cada auditoría desde entonces: en todo este tiempo, el Consejo no ha encontrado una cámara abierta ni un registro incompleto.' WHERE sigla = 'CCSL';
UPDATE premio SET descripcion = 'Concedido a AlienMilk por convertir la exploración láctea en una categoría propia de experiencia recreativa. La Confederación destacó su capacidad para combinar descubrimiento, degustación y participación pública en un formato «suficientemente extraño para necesitar nombre propio».' WHERE sigla = 'CATL';
UPDATE premio SET descripcion = 'Reconoce la labor de AlienMilk en la creación de espacios donde personas de distintas procedencias, culturas y naturalezas comparten actividades en igualdad de condiciones. El Consejo destacó especialmente su capacidad para convertir esa diversidad en parte de la experiencia, favoreciendo el intercambio y el entendimiento entre comunidades que rara vez coinciden en un mismo lugar.' WHERE sigla = 'CSH';
UPDATE premio SET descripcion = 'Concedida tras someter la infraestructura de AlienMilk a pruebas de intrusión, pérdida de instalaciones, compromiso interno simulado y degradación deliberada de sus sistemas. La Cámara concluyó que obtener información protegida requeriría más recursos de los que razonablemente justificaría conocerla. El informe público ocupa tres líneas. El resto permanece clasificado.' WHERE sigla = 'CMR';
UPDATE premio SET descripcion = 'Premia el uso de la textura, la temperatura y el silencio como ingredientes. El jurado del Foro probó la sesión a ciegas y pidió repetirla con los ojos abiertos, por si acaso.' WHERE sigla = 'FEN';
UPDATE premio SET descripcion = 'La Asociación FurriCompostela nombró a AlienMilk miembro honorífico tras varias ediciones del Furrfestigal sirviendo leche templada a asistentes de todos los pelajes. El carné no caduca.' WHERE sigla = 'AFC';
UPDATE premio SET descripcion = 'Primer acuerdo de distribución minorista de AlienMilk para una colección de leches seleccionadas por su interés gastronómico. La campaña introdujo sabores, texturas y propiedades culinarias desconocidas para buena parte del público de Vesta. Tres referencias permanecieron en catálogo después de que la edición limitada dejara de ser limitada.' WHERE sigla = 'GV';
UPDATE premio SET descripcion = 'Reconoce la capacidad de AlienMilk para integrar juego corporal, texturas, aromas, temperatura, brillo y puesta en escena dentro de experiencias swinger para públicos diversos. El jurado destacó especialmente aquellas sesiones en las que la leche dejó de ser algo que se sirve en una copa y pasó a formar parte del espacio, de los cuerpos y del juego. El Salón SWX subrayó además su uso de baños, látex, iluminación y contacto corporal para crear experiencias sensoriales únicas.' WHERE sigla = 'SWX';
UPDATE premio SET descripcion = 'Reconocimiento concedido tras superar el millón de suscripciones activas en OnlyMilk. La plataforma destacó la producción regular de contenido exclusivo, las retransmisiones de sesiones y una comunidad particularmente participativa. AlienMilk sostiene que la mayoría está allí por razones estrictamente lácteas.' WHERE sigla = 'OF';

-- Solicitudes de los formularios públicos (misma definición que migraciones/2026-10-07-solicitudes.sql).
CREATE TABLE IF NOT EXISTS solicitudes (
	id_solicitud INT AUTO_INCREMENT PRIMARY KEY,
	referencia VARCHAR(20) UNIQUE,
	formulario VARCHAR(60) NOT NULL,
	asunto VARCHAR(160) NOT NULL,
	nombre VARCHAR(120) NOT NULL,
	email VARCHAR(120) NOT NULL,
	datos TEXT NOT NULL,
	estado VARCHAR(12) NOT NULL DEFAULT 'NUEVA',
	creada_en DATETIME NOT NULL,
	atendida_en DATETIME,
	INDEX ix_solicitudes_creada_en (creada_en)
);

-- Tienda (misma definición que migraciones/2026-10-09-tienda.sql).
CREATE TABLE IF NOT EXISTS productos (
	id_producto INT AUTO_INCREMENT PRIMARY KEY,
	slug VARCHAR(60) NOT NULL UNIQUE,
	nombre VARCHAR(80) NOT NULL,
	categoria VARCHAR(12) NOT NULL,
	resumen VARCHAR(160) NOT NULL,
	descripcion TEXT NOT NULL,
	procedencia VARCHAR(120) NOT NULL,
	formato VARCHAR(40) NOT NULL,
	lote VARCHAR(20) NOT NULL,
	conservacion VARCHAR(200) NOT NULL,
	distribucion VARCHAR(160) NOT NULL,
	advertencia VARCHAR(200),
	precio DECIMAL(9,2) NOT NULL,
	existencias INT NOT NULL DEFAULT 0,
	tono VARCHAR(12) NOT NULL,
	orden INT NOT NULL DEFAULT 0,
	activo BOOLEAN NOT NULL DEFAULT TRUE,
	CONSTRAINT ck_producto_categoria CHECK (categoria IN ('LECHE', 'DERIVADO', 'MESA')),
	CONSTRAINT ck_producto_precio CHECK (precio >= 0),
	CONSTRAINT ck_producto_existencias CHECK (existencias >= 0)
);

CREATE TABLE IF NOT EXISTS pedidos (
	id_pedido INT AUTO_INCREMENT PRIMARY KEY,
	referencia VARCHAR(20) UNIQUE,
	-- Sin usuario es un pedido de invitado: nombre, correo y la huella de la clave de su enlace.
	username VARCHAR(45),
	nombre VARCHAR(80),
	correo VARCHAR(120),
	clave_hash CHAR(64),
	estado VARCHAR(16) NOT NULL,
	entrega VARCHAR(12) NOT NULL,
	direccion VARCHAR(200),
	subtotal DECIMAL(9,2) NOT NULL,
	gastos_envio DECIMAL(9,2) NOT NULL,
	total DECIMAL(9,2) NOT NULL,
	creado_en DATETIME NOT NULL,
	anulado_en DATETIME,
	-- Cobro con Stripe Checkout: la sesión de pago, hasta cuándo se puede pagar, el pago y su devolución.
	pago_sesion VARCHAR(255),
	pago_url VARCHAR(1024),
	pago_caduca_en DATETIME,
	pago_id VARCHAR(255),
	pagado_en DATETIME,
	reembolso_id VARCHAR(255),
	-- Gestión desde /admin: salida del centro de distribución y entrega (o recogida en la sede).
	enviado_en DATETIME,
	entregado_en DATETIME,
	CONSTRAINT fk_pedidos_usuarios FOREIGN KEY (username) REFERENCES usuarios(username),
	CONSTRAINT ck_pedido_estado CHECK (estado IN ('PENDIENTE_PAGO', 'CONFIRMADO', 'ENVIADO', 'ENTREGADO', 'ANULADO')),
	CONSTRAINT ck_pedido_entrega CHECK (entrega IN ('ENVIO', 'RECOGIDA')),
	CONSTRAINT ck_pedido_comprador CHECK (
		username IS NOT NULL OR (nombre IS NOT NULL AND correo IS NOT NULL AND clave_hash IS NOT NULL)),
	UNIQUE INDEX uk_pedidos_pago_sesion (pago_sesion),
	INDEX idx_pedidos_pendientes (estado, pago_caduca_en),
	INDEX idx_pedidos_usuario (username, creado_en)
);

CREATE TABLE IF NOT EXISTS lineas_pedido (
	id_linea INT AUTO_INCREMENT PRIMARY KEY,
	id_pedido INT NOT NULL,
	id_producto INT NOT NULL,
	nombre VARCHAR(80) NOT NULL,
	precio_unitario DECIMAL(9,2) NOT NULL,
	cantidad INT NOT NULL,
	importe DECIMAL(9,2) NOT NULL,
	CONSTRAINT fk_lineas_pedidos FOREIGN KEY (id_pedido) REFERENCES pedidos(id_pedido) ON DELETE CASCADE,
	CONSTRAINT fk_lineas_productos FOREIGN KEY (id_producto) REFERENCES productos(id_producto),
	CONSTRAINT ck_linea_cantidad CHECK (cantidad > 0)
);

-- tono: color de la muestra en el frontend (features/shop/shop-shared.css).
INSERT IGNORE INTO productos
	(slug, nombre, categoria, resumen, descripcion, procedencia, formato, lote, conservacion, distribucion, advertencia, precio, existencias, tono, orden)
VALUES
('leche-entera-ceto-iv', 'Leche entera de Ceto IV', 'LECHE',
	'La leche de referencia de la casa, ordeñada a mano y sin homogeneizar.',
	'Procede de la granja asociada de Ceto IV, donde el ordeño sigue haciéndose a mano y de madrugada. No se homogeneiza: la nata sube a la superficie en unas horas y conviene agitar la botella con suavidad antes de servir. Es ligeramente salina, con un final de almendra tostada, y es la que se sirve al principio de cada sesión para que el paladar tenga un punto de partida.',
	'Ceto IV · Granja asociada', '750 ml', 'AM-L-0427',
	'Entre 2 y 5 °C. Una vez abierta, consumir en un plazo de tres días.',
	'Todos los territorios con cadena de frío garantizada.',
	'Contiene lactosa. Puede contener trazas de plancton.',
	6.40, 148, 'nacar', 1),
('leche-de-pelagia', 'Leche de Pelagia', 'LECHE',
	'Densa, muy fría al paladar y de un azul pálido que se aclara con el aire.',
	'Se obtiene en la Estación Pelagia de organismos de aguas profundas que la producen para alimentar a sus crías durante la travesía. Es densa y fría al paladar, de un azul muy pálido que se aclara al contacto con el aire. Se sirve sin hielo y en copa estrecha, que conserva mejor el frío.',
	'Estación Pelagia · AE03, Lagos', '500 ml', 'AM-L-0512',
	'Entre 2 y 5 °C, en posición vertical. No congelar.',
	'Limitada a territorios con puerto refrigerado.',
	'Agitar con suavidad. Si se agita con energía emite un zumbido breve; es normal.',
	9.80, 37, 'glaciar', 2),
('leche-simbiotica-de-liquen', 'Leche simbiótica de liquen', 'LECHE',
	'La producen dos organismos a la vez. Ninguno de los dos acepta la autoría.',
	'Este liquen de los valles de TRAPPIST-1e es, en realidad, dos organismos que viven juntos desde hace cuatro mil años. La leche la producen entre los dos, y cada cosecha sabe distinta según cuál haya llevado la iniciativa: unas veces herbácea, otras casi dulce. Se recomienda probarla sola, a temperatura de bodega.',
	'TRAPPIST-1e · Valle de Hesse', '330 ml', 'AM-L-0388',
	'Entre 8 y 12 °C, lejos de la luz directa.',
	'Todos los territorios.',
	'Producto vivo. La botella puede cambiar ligeramente de color durante el transporte.',
	7.20, 8, 'liquen', 3),
('mantequilla-cultivada', 'Mantequilla cultivada', 'DERIVADO',
	'Batida con la nata de la leche de la casa y madurada durante dos días.',
	'Se bate a partir de la nata de la leche de Ceto IV, la misma que se sirve en las sesiones, y se madura durante dos días con cultivos de la propia granja. El resultado es una mantequilla de color pálido, con una acidez suave y un fondo salino que recuerda a su procedencia.',
	'Ceto IV · Granja asociada', '250 g', 'AM-D-0119',
	'Entre 2 y 5 °C. Sacar del frío diez minutos antes de servir.',
	'Todos los territorios con cadena de frío garantizada.',
	'Contiene lactosa y sal marina de origen.',
	8.50, 64, 'mantequilla', 4),
('queso-de-cueva-de-gliese', 'Queso de cueva de Gliese', 'DERIVADO',
	'Catorce meses en unas cuevas donde la temperatura no ha cambiado en tres siglos.',
	'Se madura durante catorce meses en las cuevas de la meseta de Ossar, en Gliese 667 Cc, a pocos kilómetros de la sede central. La temperatura de las cuevas no ha cambiado en tres siglos, y se nota en la corteza: fina, seca y de un gris casi azul. La pasta es firme, con notas de nuez y de piedra húmeda.',
	'Gliese 667 Cc · Meseta de Ossar', 'Pieza de 200 g', 'AM-D-0074',
	'Entre 4 y 8 °C, envuelto en papel. Nunca en plástico.',
	'Transporte refrigerado a cargo de Frío Gliese.',
	'Contiene leche cruda.',
	14.90, 0, 'piedra', 5),
('kefir-de-tau-ceti', 'Kéfir de Tau Ceti', 'DERIVADO',
	'Fermentado con granos cedidos por la Federación de Catadores de Tau Ceti.',
	'Los granos con los que se fermenta proceden de la Federación de Catadores de Tau Ceti, que los cede a AlienMilk desde hace once ciclos. Es ligero, de burbuja fina y final ácido. Su sabor cambia ligeramente según quién lo pruebe; la Federación lo considera una virtud.',
	'Tau Ceti · Federación de Catadores', '500 ml', 'AM-D-0131',
	'Entre 2 y 5 °C. Abrir despacio: el fermento sigue activo.',
	'Todos los territorios con cadena de frío garantizada.',
	'No apto para organismos que compartan el sentido del gusto.',
	6.90, 52, 'lila', 6),
('copa-de-degustacion', 'Copa de degustación', 'MESA',
	'La copa de las sesiones: boca estrecha para el aroma, base ancha para las leches densas.',
	'Es la copa que se usa en todas las sesiones de AlienMilk. La boca estrecha concentra el aroma y la base ancha deja que las leches más densas se asienten sin formar capas. Se sopla a mano en un taller de A Coruña, así que no hay dos exactamente iguales.',
	'Tierra · Taller de vidrio de A Coruña', '180 ml', 'AM-M-0023',
	'Apta para lavavajillas. Secar boca abajo.',
	'Todos los territorios.',
	'Vidrio soplado: las pequeñas burbujas del cristal son propias del proceso.',
	18.00, 90, 'cristal', 7),
('estuche-isotermico', 'Estuche isotérmico', 'MESA',
	'Mantiene dos botellas entre 2 y 5 °C durante 48 horas, en cualquier gravedad.',
	'Diseñado junto a Frío Gliese, el operador que transporta las leches de AlienMilk entre sistemas. Mantiene dos botellas de hasta 750 ml entre 2 y 5 °C durante 48 horas, sin hielo ni corriente. El cierre está pensado para manos de cualquier forma.',
	'Gliese 667 Cc · Frío Gliese', 'Dos botellas', 'AM-M-0007',
	'Limpiar con un paño húmedo. No sumergir.',
	'Todos los territorios.',
	'Conserva el frío, no lo genera: introduzca las botellas ya refrigeradas.',
	32.00, 25, 'grafito', 8),
('catalogo-de-procedencias', 'Catálogo de procedencias 2026', 'MESA',
	'Las procedencias del archivo, con su organismo de origen y sus notas de cata.',
	'Reúne las procedencias del archivo de AlienMilk tal como se catalogan en la sede central: organismo de origen, método de extracción, notas de cata y ficha de conservación de cada muestra. Edición en tapa dura, revisada para el ciclo 2026, con un índice por sistemas.',
	'Archivo AlienMilk · Estación Meridiana', '312 páginas', 'AM-M-0031',
	'Lejos de la humedad y de las leches abiertas.',
	'Todos los territorios.',
	'Algunas fichas incluyen ilustraciones a tamaño real.',
	24.00, 120, 'papel', 9);

-- Expediente de cada sesión: el contenido de su ficha pública (texto, notas de cata, programa,
-- acceso, equipo, preguntas...). Se edita desde /admin: en Modificar sesión o en la edición en lote.
CREATE TABLE IF NOT EXISTS expedientes (
	clave VARCHAR(20) PRIMARY KEY,
	contenido LONGTEXT NOT NULL
);

INSERT INTO expedientes (clave, contenido) VALUES
('SESION:1', '{"entradilla":"Sesión inaugural del ciclo 2026. Cinco muestras de la cosecha recuperada en la órbita de Orión, servidas en orden de densidad creciente.","texto":["La Cata de Leche Abducida abre cada año la programación de AlienMilk Sessions. Es, por tradición, la sesión más concurrida del ciclo y también la más sencilla de explicar: se prueba lo que ha llegado.","El lote de este año procede de la órbita de Orión y se conserva en la cámara principal del Hangar 7 desde su recepción. El equipo de sala presenta cinco muestras en orden de densidad creciente, acompañadas de agua templada y pan sin sal para neutralizar el paladar entre servicios.","No se requiere experiencia previa. Cada asistente recibe una ficha de cata en papel donde anotar sus impresiones, que pasan a formar parte del archivo si así lo autoriza.","Algunas muestras presentan una ligera actividad durante los primeros minutos tras el servicio. Es habitual y no afecta a la degustación."],"procedencia":"Órbita de Orión","notasCata":[{"etiqueta":"Color","valor":"Del marfil al gris perla"},{"etiqueta":"Cuerpo","valor":"Medio a denso"},{"etiqueta":"Textura","valor":"Sedosa, con un final ligeramente granulado"},{"etiqueta":"Servicio","valor":"11–13 °C"},{"etiqueta":"Persistencia","valor":"Larga"}],"programa":[{"hora":"19:15","titulo":"Apertura de taquilla de acreditación"},{"hora":"19:45","titulo":"Bienvenida y lectura del protocolo de sala"},{"hora":"20:00","titulo":"Primer servicio","detalle":"Muestras I y II."},{"hora":"20:40","titulo":"Pausa y ventilación de sala"},{"hora":"20:55","titulo":"Segundo servicio","detalle":"Muestras III a V."},{"hora":"21:45","titulo":"Puesta en común y cierre"}],"equipo":[{"etiqueta":"Dirección de sala","valor":"Irene Valcárcel"},{"etiqueta":"Sumillería","valor":"Tomás Aguirre-Nnadi"},{"etiqueta":"Conservación","valor":"Unidad Técnica del Hangar 7"},{"etiqueta":"Acompañamiento","valor":"Personal acreditado AlienMilk"}],"acceso":[{"etiqueta":"Acreditación","valor":"Taquilla de acreditación, 45 minutos antes del inicio. El control de ingreso cierra 10 minutos antes."},{"etiqueta":"Documentación","valor":"Código de acceso y documento identificativo vigente."},{"etiqueta":"Edad mínima","valor":"18 años, salvo indicación expresa en la sesión."}],"recomendaciones":["No acuda en ayunas ni inmediatamente después de una comida copiosa.","Indique cualquier intolerancia en el campo de observaciones al reservar.","Los objetos personales se depositan en consigna durante toda la sesión."],"preguntas":[{"pregunta":"¿Puedo asistir si tengo alguna intolerancia alimentaria?","respuesta":"Sí. Indíquela en el campo de observaciones al reservar. El equipo de sala preparará una alternativa o le asignará un puesto de observación sin degustación."},{"pregunta":"¿Puedo cancelar mi reserva?","respuesta":"Sí, desde su panel de participante hasta el día anterior a la sesión. El importe se reintegra en un plazo de cinco días hábiles."},{"pregunta":"¿Qué ocurre si la sesión se suspende?","respuesta":"Las suspensiones por condiciones de la estación se comunican con al menos 48 horas de antelación, salvo causa sobrevenida. Se reintegra el importe íntegro o se ofrece plaza en la siguiente convocatoria."},{"pregunta":"¿Se puede fotografiar la sala?","respuesta":"Solo en las zonas señalizadas. Las muestras no se fotografían."},{"pregunta":"¿De dónde proceden las muestras?","respuesta":"AlienMilk trabaja con una red estable de proveedores y colaboradores. Por respeto a los acuerdos que hacen posible cada extracción, no revelamos el origen biológico ni el método de obtención."}],"colaboradores":[{"rol":"Sede","nombre":"Fundación Cúpula Central","detalle":"Sala de catas en régimen de convenio"},{"rol":"Financiación","nombre":"Agencia Marciana de Cooperación Cultural","detalle":"Programa Ares 2026 · Intercambio gastronómico"},{"rol":"Tránsito","nombre":"AM Transit","detalle":"Traslados desde el intercambiador"},{"rol":"Custodia","nombre":"Helix Transfer","detalle":"Custodia de envases"}],"creditos":"Con la colaboración de los proveedores del ciclo 2026, que han preferido no ser mencionados."}'),
('SESION:2', '{"entradilla":"Una primera aproximación al contacto, con luces bajas, humo frío y un protocolo de bienvenida pensado para quien nunca ha sido recogido.","texto":["Esta sesión está diseñada para visitantes sin experiencia previa en procesos de recogida. Durante cien minutos, la Cúpula Beta reproduce las condiciones habituales de un primer contacto a una intensidad deliberadamente reducida.","La experiencia combina iluminación de baja frecuencia, humo frío y una degustación breve al final del recorrido. El personal explica cada fase antes de que comience, y es posible abandonar la sala en cualquier momento por las salidas señalizadas.","Recomendamos acudir con ropa cómoda y sin objetos metálicos de gran tamaño. Los relojes analógicos pueden adelantarse ligeramente durante la sesión; recuperan la hora al salir.","El acompañamiento del personal finaliza una vez completado el procedimiento de salida correspondiente."],"procedencia":"No declarada","notasCata":[{"etiqueta":"Color","valor":"Blanco translúcido"},{"etiqueta":"Cuerpo","valor":"Ligero"},{"etiqueta":"Textura","valor":"Aireada, casi espuma"},{"etiqueta":"Servicio","valor":"4–6 °C"},{"etiqueta":"Persistencia","valor":"Breve"}],"programa":[{"hora":"18:30","titulo":"Acreditación"},{"hora":"19:00","titulo":"Recepción en el vestíbulo","detalle":"Entrega de indumentaria y lectura del protocolo."},{"hora":"19:15","titulo":"Ascenso"},{"hora":"19:55","titulo":"Estancia"},{"hora":"20:25","titulo":"Descenso y degustación de bienvenida"},{"hora":"20:40","titulo":"Procedimiento de salida"}],"equipo":[{"etiqueta":"Coordinación","valor":"Marta Oyelaran-Ruiz"},{"etiqueta":"Iluminación y atmósfera","valor":"Estudio Nimbo"},{"etiqueta":"Acompañamiento","valor":"Personal acreditado AlienMilk"}],"acceso":[{"etiqueta":"Acreditación","valor":"Taquilla de acreditación, 45 minutos antes del inicio. El control de ingreso cierra 10 minutos antes."},{"etiqueta":"Documentación","valor":"Código de acceso y documento identificativo vigente."},{"etiqueta":"Edad mínima","valor":"18 años, salvo indicación expresa en la sesión."},{"etiqueta":"Edad mínima","valor":"16 años acompañados de una persona adulta."},{"etiqueta":"Salud","valor":"No recomendada para personas con fotosensibilidad."}],"recomendaciones":["No acuda en ayunas ni inmediatamente después de una comida copiosa.","Indique cualquier intolerancia en el campo de observaciones al reservar.","Los objetos personales se depositan en consigna durante toda la sesión."],"preguntas":[{"pregunta":"¿Puedo asistir si tengo alguna intolerancia alimentaria?","respuesta":"Sí. Indíquela en el campo de observaciones al reservar. El equipo de sala preparará una alternativa o le asignará un puesto de observación sin degustación."},{"pregunta":"¿Puedo cancelar mi reserva?","respuesta":"Sí, desde su panel de participante hasta el día anterior a la sesión. El importe se reintegra en un plazo de cinco días hábiles."},{"pregunta":"¿Qué ocurre si la sesión se suspende?","respuesta":"Las suspensiones por condiciones de la estación se comunican con al menos 48 horas de antelación, salvo causa sobrevenida. Se reintegra el importe íntegro o se ofrece plaza en la siguiente convocatoria."},{"pregunta":"¿Se puede fotografiar la sala?","respuesta":"Solo en las zonas señalizadas. Las muestras no se fotografían."},{"pregunta":"¿De dónde proceden las muestras?","respuesta":"AlienMilk trabaja con una red estable de proveedores y colaboradores. Por respeto a los acuerdos que hacen posible cada extracción, no revelamos el origen biológico ni el método de obtención."}],"colaboradores":[{"rol":"Sede","nombre":"Recinto Ferial de Cúpulas de Madrid","detalle":"Cúpula 3, acondicionada para primeras experiencias"},{"rol":"Acompañamiento","nombre":"Observatorio de Primeros Contactos","detalle":"Asesora a participantes sin experiencia previa"},{"rol":"Tránsito","nombre":"AM Transit","detalle":"Regreso garantizado al punto de partida"}],"creditos":"Programa AlienMilk Sessions · Ciclo 2026."}'),
('SESION:3', '{"entradilla":"Taller práctico de preparación. Cada participante trabaja con su propia base y se lleva a casa lo que consiga estabilizar.","texto":["El Taller de Espuma Galáctica es la sesión más práctica del programa. En grupos de seis, los participantes aprenden a airear, templar y estabilizar mezclas de base AlienMilk hasta obtener espumas con cuerpo suficiente para el servicio.","El Módulo Lácteo 3 dispone de puestos individuales con batidor de vaina, placa de temperatura controlada y campana de extracción. Todo el material se proporciona en sala.","Las espumas se prueban en común al final del taller. Las que mantienen la forma durante más de cuarenta minutos pueden llevarse a casa en envase isotérmico.","Algunas mezclas tienden a crecer. El equipo de sala indicará en qué momento conviene dejar de batir."],"procedencia":"Base AlienMilk de archivo","notasCata":[{"etiqueta":"Color","valor":"Lavanda pálido a violeta"},{"etiqueta":"Cuerpo","valor":"Según técnica"},{"etiqueta":"Textura","valor":"Espuma firme, burbuja fina"},{"etiqueta":"Servicio","valor":"18 °C"},{"etiqueta":"Persistencia","valor":"Media"}],"programa":[{"hora":"17:30","titulo":"Acreditación y asignación de puesto"},{"hora":"18:00","titulo":"Presentación de la base"},{"hora":"18:20","titulo":"Primera práctica: aireado"},{"hora":"19:10","titulo":"Segunda práctica: templado y estabilización"},{"hora":"19:50","titulo":"Emplatado"},{"hora":"20:15","titulo":"Degustación en común y entrega de envases"}],"equipo":[{"etiqueta":"Dirección del taller","valor":"Aurelio Bastida"},{"etiqueta":"Asistencia técnica","valor":"Noa Ferreira"},{"etiqueta":"Seguridad alimentaria","valor":"Departamento de Conservación"}],"acceso":[{"etiqueta":"Acreditación","valor":"Taquilla de acreditación, 45 minutos antes del inicio. El control de ingreso cierra 10 minutos antes."},{"etiqueta":"Documentación","valor":"Código de acceso y documento identificativo vigente."},{"etiqueta":"Edad mínima","valor":"18 años, salvo indicación expresa en la sesión."},{"etiqueta":"Indumentaria","valor":"Calzado cerrado. El resto del equipo se proporciona en sala."},{"etiqueta":"Grupos","valor":"Seis participantes por puesto."}],"recomendaciones":["No acuda en ayunas ni inmediatamente después de una comida copiosa.","Indique cualquier intolerancia en el campo de observaciones al reservar.","Los objetos personales se depositan en consigna durante toda la sesión."],"preguntas":[{"pregunta":"¿Puedo asistir si tengo alguna intolerancia alimentaria?","respuesta":"Sí. Indíquela en el campo de observaciones al reservar. El equipo de sala preparará una alternativa o le asignará un puesto de observación sin degustación."},{"pregunta":"¿Puedo cancelar mi reserva?","respuesta":"Sí, desde su panel de participante hasta el día anterior a la sesión. El importe se reintegra en un plazo de cinco días hábiles."},{"pregunta":"¿Qué ocurre si la sesión se suspende?","respuesta":"Las suspensiones por condiciones de la estación se comunican con al menos 48 horas de antelación, salvo causa sobrevenida. Se reintegra el importe íntegro o se ofrece plaza en la siguiente convocatoria."},{"pregunta":"¿Se puede fotografiar la sala?","respuesta":"Solo en las zonas señalizadas. Las muestras no se fotografían."},{"pregunta":"¿De dónde proceden las muestras?","respuesta":"AlienMilk trabaja con una red estable de proveedores y colaboradores. Por respeto a los acuerdos que hacen posible cada extracción, no revelamos el origen biológico ni el método de obtención."}],"colaboradores":[{"rol":"Sede","nombre":"Laboratorios Compartidos de Vallecas","detalle":"Laboratorio húmedo B"},{"rol":"Suministro","nombre":"Vidriería Orbital Hermanos Sanz","detalle":"Cristalería del taller"},{"rol":"Financiación","nombre":"Agencia Marciana de Cooperación Cultural","detalle":"Programa Ares 2026 · Oficios sensoriales"},{"rol":"Envasado","nombre":"Helix Transfer","detalle":"Envases homologados para llevar"}],"creditos":"Programa AlienMilk Sessions · Ciclo 2026."}'),
('SESION:4', '{"entradilla":"Recorrido narrado por las zonas de conservación donde descansa el primer lote de leche abducida. Se camina a oscuras y en silencio.","texto":["La Ruta Nocturna recorre las zonas del Hangar que permanecen cerradas el resto del ciclo: la antigua sala de recepción, los pasillos de frío y la cámara donde se conserva el primer lote recibido por AlienMilk.","El recorrido se realiza en grupos reducidos, con guía y linternas de luz roja para no alterar las condiciones de las cámaras. Se ruega no tocar las superficies ni golpear los cristales.","La visita termina en el antiguo muelle de carga, donde se sirve una pequeña muestra del lote histórico. Es la única ocasión del año en que se abre.","Si durante el recorrido escucha algo, no es necesario comunicarlo al personal."],"procedencia":"Primer lote de archivo","notasCata":[{"etiqueta":"Color","valor":"Ámbar pálido"},{"etiqueta":"Cuerpo","valor":"Denso"},{"etiqueta":"Textura","valor":"Untuosa"},{"etiqueta":"Servicio","valor":"8 °C"},{"etiqueta":"Persistencia","valor":"Muy larga"}],"programa":[{"hora":"22:30","titulo":"Acreditación en el Acceso Norte"},{"hora":"22:45","titulo":"Entrega de linternas"},{"hora":"23:00","titulo":"Antigua sala de recepción"},{"hora":"23:25","titulo":"Pasillos de frío"},{"hora":"23:50","titulo":"Cámara del primer lote"},{"hora":"00:15","titulo":"Muelle de carga y degustación"}],"equipo":[{"etiqueta":"Guía","valor":"Rosa Etxeberria, archivo histórico"},{"etiqueta":"Conservación","valor":"Unidad Técnica del Hangar 7"}],"acceso":[{"etiqueta":"Acreditación","valor":"Taquilla de acreditación, 45 minutos antes del inicio. El control de ingreso cierra 10 minutos antes."},{"etiqueta":"Documentación","valor":"Código de acceso y documento identificativo vigente."},{"etiqueta":"Edad mínima","valor":"18 años, salvo indicación expresa en la sesión."},{"etiqueta":"Recorrido","valor":"A pie. Incluye escaleras y zonas de baja iluminación."},{"etiqueta":"Distancia","valor":"1,4 km a pie."},{"etiqueta":"Fotografía","valor":"No se permite el uso de flash."}],"recomendaciones":["No acuda en ayunas ni inmediatamente después de una comida copiosa.","Indique cualquier intolerancia en el campo de observaciones al reservar.","Los objetos personales se depositan en consigna durante toda la sesión."],"preguntas":[{"pregunta":"¿Puedo asistir si tengo alguna intolerancia alimentaria?","respuesta":"Sí. Indíquela en el campo de observaciones al reservar. El equipo de sala preparará una alternativa o le asignará un puesto de observación sin degustación."},{"pregunta":"¿Puedo cancelar mi reserva?","respuesta":"Sí, desde su panel de participante hasta el día anterior a la sesión. El importe se reintegra en un plazo de cinco días hábiles."},{"pregunta":"¿Qué ocurre si la sesión se suspende?","respuesta":"Las suspensiones por condiciones de la estación se comunican con al menos 48 horas de antelación, salvo causa sobrevenida. Se reintegra el importe íntegro o se ofrece plaza en la siguiente convocatoria."},{"pregunta":"¿Se puede fotografiar la sala?","respuesta":"Solo en las zonas señalizadas. Las muestras no se fotografían."},{"pregunta":"¿De dónde proceden las muestras?","respuesta":"AlienMilk trabaja con una red estable de proveedores y colaboradores. Por respeto a los acuerdos que hacen posible cada extracción, no revelamos el origen biológico ni el método de obtención."}],"colaboradores":[{"rol":"Sede","nombre":"Consorcio Aeroportuario Norte","detalle":"Titular del Hangar 7 desde 1987"},{"rol":"Conservación","nombre":"Instituto de Frío Patrimonial","detalle":"Mantiene las cámaras del primer lote"},{"rol":"Tránsito","nombre":"AM Transit","detalle":"Última salida a las 00:40"}],"creditos":"Programa AlienMilk Sessions · Ciclo 2026."}'),
('SESION:5', '{"entradilla":"Cata nocturna bajo la cúpula de ordeño lunar, sincronizada con el paso de la sombra. Tres tiempos, tres muestras, tres temperaturas.","texto":["La Sesión Eclipse Lunar se programa según el calendario astronómico y las condiciones de la Cúpula Eclipse. Durante tres horas, los asistentes degustan muestras obtenidas en la cara oculta mientras la sala se oscurece al ritmo del eclipse.","El servicio se divide en tres tiempos: antes, durante y después de la totalidad. Cada tiempo tiene su propia muestra y su propia temperatura de servicio.","La cúpula acoge a quinientas personas en gradas escalonadas. Recomendamos llegar con antelación para elegir ubicación: las filas superiores ofrecen mejor visibilidad y algo menos de gravedad.","Si el cielo no permite observar el eclipse, la sesión se celebra igualmente. La muestra no depende del cielo."],"procedencia":"Cara oculta","notasCata":[{"etiqueta":"Color","valor":"Gris plata con reflejo azul"},{"etiqueta":"Cuerpo","valor":"Medio"},{"etiqueta":"Textura","valor":"Fría, ligeramente eléctrica"},{"etiqueta":"Servicio","valor":"2 °C · 9 °C · 14 °C"},{"etiqueta":"Persistencia","valor":"Larga"}],"programa":[{"hora":"21:00","titulo":"Apertura de puertas"},{"hora":"21:40","titulo":"Primer tiempo: penumbra"},{"hora":"22:30","titulo":"Segundo tiempo: totalidad"},{"hora":"23:15","titulo":"Tercer tiempo: salida de la sombra"},{"hora":"23:50","titulo":"Cierre"}],"equipo":[{"etiqueta":"Dirección de sala","valor":"Irene Valcárcel"},{"etiqueta":"Observación","valor":"Oficina Astronómica AlienMilk"},{"etiqueta":"Sumillería","valor":"Tomás Aguirre-Nnadi"}],"acceso":[{"etiqueta":"Acreditación","valor":"Taquilla de acreditación, 45 minutos antes del inicio. El control de ingreso cierra 10 minutos antes."},{"etiqueta":"Documentación","valor":"Código de acceso y documento identificativo vigente."},{"etiqueta":"Edad mínima","valor":"18 años, salvo indicación expresa en la sesión."}],"recomendaciones":["No acuda en ayunas ni inmediatamente después de una comida copiosa.","Indique cualquier intolerancia en el campo de observaciones al reservar.","Los objetos personales se depositan en consigna durante toda la sesión."],"preguntas":[{"pregunta":"¿Puedo asistir si tengo alguna intolerancia alimentaria?","respuesta":"Sí. Indíquela en el campo de observaciones al reservar. El equipo de sala preparará una alternativa o le asignará un puesto de observación sin degustación."},{"pregunta":"¿Puedo cancelar mi reserva?","respuesta":"Sí, desde su panel de participante hasta el día anterior a la sesión. El importe se reintegra en un plazo de cinco días hábiles."},{"pregunta":"¿Qué ocurre si la sesión se suspende?","respuesta":"Las suspensiones por condiciones de la estación se comunican con al menos 48 horas de antelación, salvo causa sobrevenida. Se reintegra el importe íntegro o se ofrece plaza en la siguiente convocatoria."},{"pregunta":"¿Se puede fotografiar la sala?","respuesta":"Solo en las zonas señalizadas. Las muestras no se fotografían."},{"pregunta":"¿De dónde proceden las muestras?","respuesta":"AlienMilk trabaja con una red estable de proveedores y colaboradores. Por respeto a los acuerdos que hacen posible cada extracción, no revelamos el origen biológico ni el método de obtención."}],"colaboradores":[{"rol":"Sede","nombre":"Recinto Ferial de Cúpulas de Madrid","detalle":"Cúpula de observación"},{"rol":"Asesoría","nombre":"Asociación de Residentes Lunares en Madrid","detalle":"Calendario y costumbres del eclipse"},{"rol":"Financiación","nombre":"Fondo Kepler para la Convivencia","detalle":"Convocatoria de encuentros nocturnos"},{"rol":"Coordinación","nombre":"Kepler Liaison","detalle":"Enlace con los organismos visitantes"}],"creditos":"Con el asesoramiento de la Oficina Astronómica AlienMilk."}');
