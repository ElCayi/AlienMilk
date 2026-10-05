# Entrega de la integración — 5 de octubre de 2026

## Incorporado

- `claude` (`b854a6e`): cierre CTA compartido entre portada y sesiones,
  presentación de Collaborators, pasos de colaboración y ajustes de ubicaciones.
- `clos` (`3dc0b59`): rediseño de Nosotros, trabajo de campo, equipo,
  pestañas de arquitectura ejecutiva y trayectoria.
- `MegaClos` (`0dfb166`): Contacto, sede en A Coruña con calle y código postal,
  enlaces sociales, tres páginas de operadores y documentación de asistentes.
- `mini-codex` (`532939e`): confirmación de contraseña, ajustes responsive del
  registro y acceso a Collaborators desde Contacto.
- `mini-codex2`: sin commits nuevos respecto a la anterior entrega.

Los dos conflictos estaban en el HTML y CSS de Contacto. Se conservó el
rediseño de MegaClos, su índice responsive y el destino `#collaborators`, junto
con los cambios compatibles de mini-codex. Se mantiene una sola entrada del
índice para Collaborators. El registro se incorporó completo.

## Validación

- `pnpm check`: lint, 22 pruebas y build de producción correctos.
- `./mvnw -q test`: 8 pruebas correctas, sin fallos ni errores.
- Navegador: portada, Nosotros, Contacto, Registro, Sesiones, los tres operadores
  y documentación a 390, 1366 y 1920 px, sin desbordamiento horizontal ni
  errores de JavaScript durante estas comprobaciones.
- Confirmación de contraseña: aparece el aviso de discrepancia y desaparece
  al igualar los campos. No se crearon cuentas en la base compartida.
- Nosotros: despliegue, selección de pestaña y repliegue comprobados.
- Contacto: destino de Collaborators presente y enlace accionable.
- Backend compartido arrancado con la integración; `GET /api/contacto` devuelve
  HTTP 200 e incluye calle, código postal y ciudad actualizados.

## Base de datos

La migración `reto-eventos-backend/migraciones/2026-10-02-sede-coruna.sql`
añade `calle` y `codigo_postal` y actualiza prudentemente la sede original.
La base local compartida **ya tenía aplicados** los campos y los datos; no fue
necesario volver a modificarla. En otros entornos debe aplicarse antes de
arrancar este backend. No ejecutar `script_bbdd.sql` sobre una base existente.

## Pendientes para colaboradores

1. **CSS y carga inicial:** Ubicaciones 47,35 kB, Portada 41,13 kB, Nosotros
   33,03 kB, Sesiones 28,85 kB y Contacto 23,51 kB. El límite de error sigue
   en 48 kB; Ubicaciones tiene poco margen. Bundle inicial 548,25 kB frente
   al aviso de 500 kB. La build pasa y no se han aumentado límites.
2. **Estilos de autenticación:** Registro sigue copiando buena parte de Login.
   Conviene compartir una base al modificar ambos de nuevo.
3. **Persistencia:** sigue la combinación de MariaDB con conector/dialecto
   MySQL y el aviso de metadatos `Unknown column 'RESERVED'`. Esta migración
   usa `ADD COLUMN IF NOT EXISTS`, por lo que no debe darse por comprobada su
   compatibilidad con un despliegue MySQL; esta entrega se validó en MariaDB.
4. **Contenido y API:** estaciones y operadores siguen siendo contenido
   estático. En sesiones quedan pendientes los horarios editoriales y decidir
   entre `/eventos/:id` y `/sesiones?sesion=:id`.
5. **Tono editorial:** el texto de llegada de Contacto contiene un insulto
   explícito sobre Renfe y «preveer». Se conserva la aportación del autor,
   pero rompe la voz institucional descrita en el brief y merece revisión.
6. Las páginas legales siguen siendo provisionales. Los destinos de operadores
   y documentación, pendientes en la entrega anterior, ya tienen páginas propias.

El vídeo local `GettyImages-1300560899.mov` permanece fuera de Git.
