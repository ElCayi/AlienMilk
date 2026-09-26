-- Ficha de contacto editable desde el panel de administración.
-- Idempotente: se puede aplicar sobre una base existente tantas veces como haga falta.
--   mariadb reserva_eventos_bbdd < reto-eventos-backend/migraciones/2026-09-26-contacto.sql

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
