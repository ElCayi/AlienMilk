# Entrega de la integración — 14 de octubre de 2026 (noche)

## Incorporado

- `claude` (`b06fd03`): Distinciones en tableta (botón «Síntesis» mayor y la medalla centrada con el
  nombre de la distinción, `--medal-shift`), rótulos de la cinta de socios como en móvil y, en móvil y
  tableta, la cinta solapada 1 px con la tinta para que no asomen rayas claras.
- `MegaClos` (`4bf2295`, `4207f0d`, `d813e38`): el bloque de devoluciones de la tienda, con fondo
  oscuro, título mayor, más aire bajo el título y a la misma distancia del pedido que el pedido del
  catálogo. Sin nota de merge.
- `mini-codex` (`ebbdb76`): cada sesión tiene su expediente completo, sin capas comunes. Llega la
  edición en lote (`/admin/sesiones/lote`), con un panel de sesiones más sereno; el expediente
  público pasa a `GET /api/eventos/{id}/expediente`. Sin nota de merge; lo resumido sale del commit.
- `clos` y `mini-codex2`: sin cambios.

## Decisiones de merge

Orden `claude` → `MegaClos` → `mini-codex`, con `--no-ff`. `git merge-tree` no dio conflictos y
ninguna pareja toca los mismos archivos.

**El backend reescribe los expedientes al arrancar.** `AplanadoExpedientes` reparte en cada sesión
las capas `GENERAL` y `TIPO:<id>` y las borra. Antes de reiniciar el backend compartido se guardó una
copia de la tabla en `/tmp/am-expedientes-antes-2026-10-14.sql`, fuera del repositorio. Tras el
arranque quedan las cinco claves `SESION:1` … `SESION:5`, y la ficha de la Cata conserva lo que
antes heredaba (preguntas, acompañamiento).

## Comprobaciones

- `pnpm check`: lint, 33 pruebas en 8 archivos y build de producción correctos.
- `./mvnw -q test`: 101 pruebas correctas.
- Backend compartido reiniciado en `50124da`. Dan 200 `/api/eventos/activos`,
  `/api/eventos/1/expediente`, el catálogo y la red de confianza. `/api/admin/eventos` sin sesión
  da 401. La ruta antigua `/api/eventos/expedientes` ya no existe (400).
- Navegador: `/`, `/tienda` y `/sesiones` a 390×844, 912×1368, 1280×720, 1536×750 y 1920×1080. No
  hay desbordamiento horizontal. El único error de consola es el aviso de `ResizeObserver loop` de la
  portada, inofensivo.
- `/sesiones` pide `/api/eventos/1/expediente` y pinta el expediente completo.
- `/admin` con la cuenta `admin`: las diez secciones, incluida «Edición en lote», cargan sin errores
  ni respuestas 4xx. La edición en lote se ve bien a 1536 y a 390. **No se guardó nada** ni se pulsó
  «Restaurar».
- Revisados a ojo: la cinta de socios a 375×667 y 912×1368 (sin rayas) y las devoluciones a 1536.
- Sin sesión, `/admin` lleva a la portada, no a `/login`.

## Migraciones

No hay migraciones nuevas. `2026-10-14-expedientes-fotos.sql` solo cambia un comentario. En otras
bases, el aplanado lo hace el backend al arrancar, después de aplicar las del 14 de octubre.

## Pendientes e incoherencias observadas

1. **Tamaños de CSS:** `home-foundation.css` llega a 47,03 kB y `locations-layout.css` está en
   47,13 kB, las dos a menos de 1 kB del error de 48 kB. Además, `trust-network.component.css` sube
   a 22,83 kB.
2. El paquete inicial está en 747,66 kB (antes 746,30 kB).
3. Sigue abierto lo de la letra al 180 % en tableta fuera de la portada (ver la entrega del 14 de
   octubre).
4. `MegaClos` y `mini-codex` siguen sin dejar nota de merge.
