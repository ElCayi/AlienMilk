# Entrega de la integración — 17 de octubre de 2026

## Incorporado

- `mini-codex` (`bc8657f` … `fc4c85d`, 7 commits), sin nota de merge; lo resumido sale de sus
  commits y de [guia-despliegue.md](../guia-despliegue.md):
  - **Cancelar ya no borra:** la reserva cancelada libera sus plazas y queda en el historial con
    cuándo, quién (cliente o AlienMilk) y el motivo, obligatorio desde el panel.
  - **Edición de reservas:** completa desde `/admin`, y los datos propios desde Mi panel
    («Modificar»).
  - **Aforo:** las reservas simultáneas ya no pasan del aforo, porque la sesión se bloquea al
    reservar. `scripts/prueba-carrera-aforo.sh` lo prueba a mano y escribe en la base: solo para la
    demo.
  - **Panel de reservas:** se ve por reserva, por cliente o por sesión (`?ver=clientes`,
    `?ver=sesiones`), con los filtros «Canceladas» y «Archivadas» y los botones «Añadir reservas
    demo» y «Restaurar demo» al pie.
  - **La vista no salta:** filtrar no devuelve la vista arriba, una fila alta abierta no se esconde
    bajo la barra y una tarjeta más alta que la pantalla se desplaza por dentro.
- `claude`, `clos`, `MegaClos` y `mini-codex2`: sin commits nuevos. `claude` sigue con cambios sin
  commitear (`liquid-backdrop.component.ts`, `about-page.component.{css,html,ts}` y
  `home-responsive.css`), que no entran.

## Decisiones de merge

`mini-codex` con `--no-ff` sobre `fecdbf8`. `git merge-tree` no dio conflictos.

## Comprobaciones

- `pnpm check`: lint, 38 pruebas y build de producción correctos.
- `./mvnw -q test`: 120 pruebas correctas (antes 113).
- Base compartida: aplicada `2026-10-17-reservas-cancelacion.sql`. Backend compartido reiniciado en
  `0973d45`. `/api/eventos/activos`, `/api/eventos/1/expediente`, el catálogo y la red de confianza
  dan 200. `/api/reservas` y `/api/admin/reservas` sin sesión dan 401.
- `/admin` con la cuenta `admin`: Sesiones, Reservas, la hoja de control de la sesión 1, Usuarios y
  Demo cargan sin errores ni respuestas 4xx. En Reservas, las vistas por cliente (2 filas) y por
  sesión (3) responden y se reflejan en la dirección. No se probó que la vista no salte, porque se
  pulsaron desde arriba. A 390 no hay desbordamiento.
- Mi panel con la cuenta `ana`: Reservas, Pedidos y Mi cuenta, sin errores. La Cata ya muestra sus
  dos participantes, y cada reserva tiene «Modificar» y «Cancelar».
- `/` y `/sesiones` a 390, 912, 1280, 1536 y 1920: no hay desbordamiento ni errores de consola.
- **No se pulsó** nada que escriba: ni Modificar, ni Cancelar, ni «Añadir reservas demo», ni
  «Restaurar demo». No se ejecutó `prueba-carrera-aforo.sh`.

## Migraciones

Aplicar en otras bases **antes** de arrancar esta versión:

1. `reto-eventos-backend/migraciones/2026-10-17-reservas-cancelacion.sql` (idempotente).

Si no se aplicaron ya, antes van las del 14 de octubre (`sesiones-fechas`, `expedientes-fotos` y
`sesiones-archivo`), la del 15 (`sesiones-hora`) y la del 16 (`reservas-asistencia`).

## Pendientes e incoherencias observadas

1. **«Restaurar demo» también está en Reservas.** Borra toda la base local, compartida por todos los
   worktrees; ahora queda más a mano.
2. **Tamaños de CSS:** `home-foundation.css` (47,03 kB) y `locations-layout.css` (47,13 kB) siguen a
   menos de 1 kB del error de 48 kB. El paquete inicial está en 748,92 kB.
3. `mini-codex` sigue sin dejar nota de merge.
4. Siguen abiertos los pendientes de las entregas anteriores, entre ellos la letra al 180 % en
   tableta fuera de la portada.
