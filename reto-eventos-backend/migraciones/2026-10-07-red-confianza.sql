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
