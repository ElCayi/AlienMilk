# Entrega de la integración — 26 de septiembre de 2026

Las ramas `claude`, `clos`, `mini-codex` y `mini-codex2` se han integrado en `main`.
Esta nota resume el estado común desde el que continuar. Las notas de merge de cada
rama describen conflictos históricos que ya están resueltos.

## Qué está integrado

- `clos`: identidad de AlienMilk, página `/contacto` editable desde el admin,
  datos compartidos con el pie de página y migración de la tabla `contacto`.
- `mini-codex`: página `/nosotros` y ajustes de navegación y pie.
- `claude`: nueva página `/sesiones`, con índice, expedientes, búsqueda y reserva.
- `mini-codex2`: ajustes móviles de la portada, ubicaciones y colaboración.
- Integración: resolución de los conflictos de portada y pie, ajuste de títulos de
  sesiones en tablet y organización del CSS de portada, ubicaciones y sesiones en
  hojas por sección. Los archivos `.component.css` importan esas hojas en el orden
  de la cascada; conservad ese orden al mover reglas.

## Comprobaciones realizadas

`pnpm check` pasó en el frontend: lint, 22 pruebas y build de producción. La
portada se comprobó en navegador a 520, 900 y 1440 px, y `/sesiones` a 520 y
1440 px, sin desbordamiento horizontal. El build todavía avisa por el tamaño
combinado del CSS de portada y ubicaciones. El presupuesto `anyComponentStyle`
avisa desde 20 kB y falla a partir de 48 kB; separar archivos no reduce el
tamaño total del componente.

## Puntos a decidir antes de ampliar estas áreas

1. Los expedientes de `/sesiones` combinan datos de la API con
   `public/data/session-dossiers.json`. El contenido específico usa IDs de
   eventos editables y algunos horarios están escritos a mano. Si se cambian,
   recrean o reprograman eventos, hay que revisar ese JSON; para una solución
   duradera conviene asociar el contenido al evento en la API y derivar los
   horarios de sus datos vigentes.
2. Conviven `/eventos/:id` y la ficha nueva en `/sesiones?sesion=:id`. Conviene
   decidir una ruta pública canónica y actualizar los enlaces antes de seguir
   ampliando el detalle o las reservas.
3. En una base de datos existente hay que aplicar
   `reto-eventos-backend/migraciones/2026-09-26-contacto.sql` antes de usar la
   nueva edición de contacto. La base local compartida ya se migró; la guía de
   despliegue explica el paso para otros entornos.

Los cambios del backend requieren reiniciar su servicio en cada worktree que
estuviera ejecutándose antes de esta integración. La referencia de voz y tono
del proyecto está en `docs/identidad-alienmilk.md`.
