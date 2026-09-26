# Notas de merge — rama `clos`

Contenido de la rama (sobre `main` en `490c9e1`):

| Commit | Qué es |
|---|---|
| `d613c45` docs | Brief de identidad de JT en `docs/identidad-alienmilk.md` |
| `7f458d1` fix | CORS de desarrollo y color del texto del admin |
| `3282731` feat | Página de contacto editable desde la API y el admin |

## Antes de nada: `7f458d1` le sirve a todas las ramas

Sin él, **en desarrollo ningún guardado del admin funciona desde el navegador** (crear, editar o
borrar devuelve 403 `Invalid CORS request`): el backend solo aceptaba el origen del puerto 4200 y
ningún worktree lo usa. Toca `scripts/services/up.sh` y dos líneas de color en
`admin-page.component.css` (todo el admin salía con texto oscuro sobre fondo oscuro).

Se puede traer solo: `git cherry-pick 7f458d1`. Cada worktree tiene que reiniciar su backend
(`wt svc up`) para que tenga efecto.

## Conflictos, medidos con `git merge-tree` el 2026-09-26

| Con | Resultado |
|---|---|
| `main` | Limpio |
| `claude` | Limpio (ver la comprobación de abajo) |
| `mini-codex` | **Conflicto en `app.html`**, el pie de contacto |
| `mini-codex2` | Conflictos en `home-content.css` y `home-session-bubbles.css`, que **no son de `clos`**: vienen de lo que `main` tiene y `mini-codex2` no. `clos` no toca esos archivos |

### `mini-codex` — `app.html`, bloque `footer-contact`

`mini-codex` reescribe a mano la lista de contacto del pie (pone "Atención a visitantes" y quita el
teléfono). `clos` la sustituye por datos que vienen de la API (`contactService.contacto()`), que es
justo lo que permite editarlos desde el admin.

**Resolución:** quedarse con la versión de `clos` de ese `<ul>` y su `ng-template`. El resto de
cambios de `mini-codex` en el pie (texto de la intro, quitar redes sociales, enlace a `/nosotros`)
no chocan y se conservan tal cual. Si se quiere la etiqueta "Atención a visitantes", se puede
añadir como primer `<li>` fijo dentro de la versión de `clos`.

### `claude` — combina solo, pero conviene comprobarlo

- `app.ts`: las dos ramas tocan zonas distintas. `claude` añade `/sesiones` a
  `shouldShowFooter()`; `clos` añade `ContactService` y `footerSchedule`. Deben quedar las dos cosas.
- `app.css`: `claude` añade `app-sessions-page` a las reglas de ancho de `.page-container`; `clos`
  añade un bloque propio para `app-contact-page` justo antes de `.site-footer`. Deben quedar los dos.

## Base de datos

- Tabla nueva `contacto` (una sola fila, `id_contacto = 1`).
- `script_bbdd.sql` la incluye al final. Si otra rama también cambia ese script, hay que quedarse
  con las dos partes, y en `DROP TABLE IF EXISTS contacto;` al principio.
- En una base que ya existe hay que aplicar `reto-eventos-backend/migraciones/2026-09-26-contacto.sql`
  (idempotente). **La MariaDB compartida de desarrollo (3306) ya la tiene aplicada.**
- Producción: explicado en `docs/guia-despliegue.md`.

## Después del merge, comprobar

1. `pnpm lint` y `pnpm exec ng test --watch=false` (19 tests en `clos`, 12 del horario de la sede).
2. `/contacto` carga la ficha y el pie muestra los mismos datos.
3. Admin → Contacto: cambiar el correo, guardar, y ver que cambia en `/contacto` y en el pie.

`pnpm check` ya fallaba en `main` por el presupuesto de CSS de `home-foundation.css` y
`locations-atlas.component.css`; no es de esta rama.
