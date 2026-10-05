-- La sede central se traslada a A Coruña (SOL-III): nombre, dirección, teléfono, cómo llegar y
-- condiciones de acceso.
-- Idempotente y prudente: solo cambia la ficha si todavía conserva los datos originales de
-- Madrid, para no pisar lo que se haya editado desde el panel de administración.
--   mariadb reserva_eventos_bbdd < reto-eventos-backend/migraciones/2026-10-02-sede-coruna.sql

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
