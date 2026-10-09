-- Red de confianza de la portada: los socios de la cinta de marcas, las distinciones y las cifras
-- de la casa.
-- El emblema es una clave del catálogo del frontend (features/trust/brands.ts).
-- Idempotente: se puede aplicar sobre una base existente tantas veces como haga falta.
--   mariadb reserva_eventos_bbdd < reto-eventos-backend/migraciones/2026-10-07-red-confianza.sql

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

-- Nombres, siglas y organismos cambiados después de la primera versión, antes del INSERT IGNORE: si
-- no, este no reconocería la fila antigua y la duplicaría con el nombre nuevo.
UPDATE premio SET nombre = 'Premio al Entretenimiento Exótico'
	WHERE sigla = 'CEE' AND nombre = 'Premio al Descubrimiento de Nuevas Formas de Entretenimiento Exótico';
UPDATE premio SET sigla = 'CATL', otorgante = 'Confederación para el Avance del Tiempo Libre'
	WHERE sigla = 'CEE';
UPDATE premio SET nombre = 'Certificación de Resiliencia Informacional · Grado Militar'
	WHERE sigla = 'CMR' AND nombre = 'Certificación de Custodia de Información · Grado Militar';
UPDATE premio SET nombre = 'Mención Especial en Programación Swinger'
	WHERE sigla = 'SWX' AND nombre = 'Mención Especial en Programación Swinger Interespecie';
UPDATE premio SET sigla = 'OF', nombre = 'Club del Millón · OnlyMilk', otorgante = 'OnlyFans'
	WHERE sigla = 'VANTA' AND nombre = 'OnlyMilk';
UPDATE premio SET sigla = 'GV', nombre = 'Colección de Orígenes Remotos', otorgante = 'Galerías Vesta'
	WHERE sigla = 'CEA' AND nombre = 'Top Circuito de Experiencias para Adultos';

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
