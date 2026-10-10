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
	estado VARCHAR(12) NOT NULL,
	entrega VARCHAR(12) NOT NULL,
	direccion VARCHAR(200),
	subtotal DECIMAL(9,2) NOT NULL,
	gastos_envio DECIMAL(9,2) NOT NULL,
	total DECIMAL(9,2) NOT NULL,
	creado_en DATETIME NOT NULL,
	anulado_en DATETIME,
	CONSTRAINT fk_pedidos_usuarios FOREIGN KEY (username) REFERENCES usuarios(username),
	CONSTRAINT ck_pedido_estado CHECK (estado IN ('CONFIRMADO', 'ENVIADO', 'ENTREGADO', 'ANULADO')),
	CONSTRAINT ck_pedido_entrega CHECK (entrega IN ('ENVIO', 'RECOGIDA')),
	CONSTRAINT ck_pedido_comprador CHECK (
		username IS NOT NULL OR (nombre IS NOT NULL AND correo IS NOT NULL AND clave_hash IS NOT NULL)),
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
