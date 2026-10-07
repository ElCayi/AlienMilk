# Trabajar en paralelo en AlienMilk

Varias personas y agentes trabajan a la vez, cada uno en su worktree y su rama, y alguien integra
todo en `main`. Aquí están las convenciones duraderas: lo que conviene saber antes de editar y antes
de fusionar. Las notas de cada merge concreto van en `docs/merge-notes/`.

La voz y el criterio de la marca están en [identidad-alienmilk.md](identidad-alienmilk.md).

## Antes de fusionar

1. **Todo commiteado.** Un merge solo recoge lo que está en commits; lo que queda sin commitear en
   un worktree se queda fuera sin avisar. Revisar `git status` en cada worktree antes de empezar,
   y que nadie siga commiteando mientras dura la integración.
2. **Cada rama deja su nota** en `docs/merge-notes/<rama>.md`: qué trae, qué choca y cómo
   resolverlo, qué hay que comprobar después. Tras integrar, la entrega común va en
   `docs/merge-notes/integracion-<fecha>.md` y las notas de rama pasan a ser historia.
3. **Medir los conflictos en lugar de suponerlos**, sin tocar ninguna rama:
   `git merge-tree --write-tree --name-only <rama-a> <rama-b>`. Un conflicto entre dos ramas
   puede venir de lo que `main` avanzó entre medias y no de ninguna de las dos.
4. **Los arreglos que desbloquean a todos van en un commit aparte**, para poder traerlos con
   `git cherry-pick` antes del merge completo.
5. **Puerta después de fusionar:** `pnpm check` en `reto-eventos-frontend` (lint, tests y build
   de producción) y `./mvnw -q compile` en el backend. Y abrir en el navegador las páginas que
   tocaba cada rama, a anchura de móvil, portátil y pantalla ancha.

## Base de datos

- **La MariaDB de desarrollo es común** a todos los worktrees (la aloja `main`, puerto 3306). Lo
  que se cambie ahí lo ven todos al momento.
- `script_bbdd.sql` **borra y recrea** las tablas: solo sirve para una base nueva. Cada cambio de
  esquema va también como **migración idempotente** en `reto-eventos-backend/migraciones/`
  (`CREATE TABLE IF NOT EXISTS`, `INSERT IGNORE`…), con fecha en el nombre, y se añade al final
  de `script_bbdd.sql`. Al fusionar dos ramas que tocan el script, hay que conservar las dos partes.
- Producción: aplicar a mano las migraciones pendientes (ver [guia-despliegue.md](guia-despliegue.md)).

## Servicios de desarrollo

- `wt session up` crea o abre la sesión del proyecto; si ya existe, no reinicia servicios.
  `wt svc up` arranca los servicios de un worktree. MariaDB y backend corren en `main`, y cada
  worktree arranca solo su frontend. `wt svc up --standalone` crea una copia privada de los tres.
- Tras un merge que toca el backend, `wt svc restart backend` reinicia el backend compartido en
  `main`; los demás worktrees usan esa misma versión.
- El backend de desarrollo acepta por CORS los orígenes `localhost` y `127.0.0.1` de cualquier
  puerto (`up.sh` exporta `CORS_ALLOWED_ORIGIN_PATTERNS`). Producción conserva sus orígenes
  explícitos. Si los guardados del admin devuelven 403 `Invalid CORS request`, comprobar esa
  configuración en el backend de `main`.
- `curl` no envía `Origin`, así que no detecta fallos de CORS. Probar las escrituras desde el
  navegador, o con `curl -H 'Origin: http://127.0.0.1:<puerto-frontend>'`.

## CSS

- La portada, las ubicaciones y las sesiones reparten su CSS en hojas por sección (`styles/`),
  que el `.component.css` importa **en el orden de la cascada**. Al mover reglas, respetar ese orden.
- Presupuesto de `anyComponentStyle` (`angular.json`): aviso desde 20 kB, error a partir de 48 kB.
  Separar en hojas **no** reduce el total del componente. El CSS combinado de portada ronda los
  41,70 kB y el de ubicaciones los 47,35 kB (integración del 7 de octubre); ubicaciones está cerca del límite de error.
- El ancho de cada página se ajusta en `app.css` con `.page-container:has(app-<pagina>-page)`;
  al crear una página nueva, mirar esas reglas antes de inventar otra.
- **El pie es un componente común** (`shared/site-footer/`) y sale en toda la web salvo en
  `/admin`. No deja margen propio: cada página decide el espacio con el que termina su último
  bloque y el pie se apoya justo debajo. No añadir excepciones del pie por página.

## Archivos que no se versionan

- `reto-eventos-frontend/public/GettyImages-1300560899.mov` (1,1 GB) se queda en local a propósito.
  Nunca hacer `git add -A` ni `git add .` en el worktree de `main` sin revisar antes qué entra:
  GitHub rechaza archivos de más de 100 MB y sacarlo luego del historial es costoso.

## Deuda abierta conocida

- `/sesiones` lee los expedientes de `public/data/session-dossiers.json` por `idEvento`, con
  horarios escritos a mano, y conviven dos rutas de ficha (`/eventos/:id` y
  `/sesiones?sesion=:id`). Detalle en
  [integracion-final-2026-09-26.md](merge-notes/integracion-final-2026-09-26.md).
- `/eventos/:id` (la ficha antigua de sesión) muestra el título y los datos con texto oscuro sobre
  fondo oscuro, el mismo fallo que tenía el admin. Conviene arreglarlo o retirarlo al decidir la
  ruta canónica.
- Aviso legal, privacidad y cookies (`/aviso-legal`, `/privacidad`, `/cookies`) comparten
  `pages/legal/` y de momento solo dicen que el documento está en redacción, qué es el proyecto
  y quién es la responsable. Falta redactar los textos (JT se ofreció); ojo con lo que de verdad
  hace la web: registro de usuarios, credenciales en `localStorage` y fuentes de Google Fonts.
