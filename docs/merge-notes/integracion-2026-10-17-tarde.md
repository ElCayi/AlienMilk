# Entrega de la integración — 17 de octubre de 2026 (tarde)

## Incorporado

- `mini-codex` (`075faa0` … `bfe63cb`, 5 commits), sin nota de merge; lo resumido sale de sus
  commits y de [guia-despliegue.md](../guia-despliegue.md):
  - **Cobro de reservas con Stripe:** las reservas hechas en la web quedan pendientes de pago y
    guardan sus plazas 30 minutos. Las del panel se pagan en taquilla. Usan las mismas claves y el
    mismo webhook que la tienda; sin `STRIPE_SECRET_KEY`, se confirman sin cobrar.
  - **Política de devoluciones** al final del programa (`/sesiones#devoluciones`), con su entrada en
    el desplegable de Sesiones.
  - **Entrada en la puerta:** se marca quién entra desde la hoja de control, con los filtros
    «Faltan» y «Han entrado», y la lista se exporta como CSV.
  - **Revisión de adaptaciones y material:** AlienMilk la acepta o no, con una nota para el
    cliente.
  - **Reactivar** una reserva cancelada.
- `claude`, `clos`, `MegaClos` y `mini-codex2`: sin commits nuevos. `claude` sigue con cambios sin
  commitear, ahora en seis archivos (Nosotros, `specimen-culture`, fondo líquido y portada), que no
  entran.

## Decisiones de merge

`mini-codex` con `--no-ff` sobre `7d55a85`. `git merge-tree` no dio conflictos.

## Comprobaciones

- `pnpm check`: lint, 38 pruebas y build de producción correctos.
- `./mvnw -q test`: 132 pruebas correctas (antes 120), incluida `PagosReservasTest`.
- Base compartida: aplicadas, en este orden, `2026-10-17-reservas-pago.sql`,
  `2026-10-17-control-ingreso.sql` y `2026-10-17-revision.sql`. Las cuatro reservas existentes
  quedan como `PAGADA`.
- Backend compartido reiniciado en `4369531`. El catálogo dice `pagoConTarjeta: true`: Stripe está
  activo en modo prueba. `/api/eventos/activos` da 200; `/api/reservas` y `/api/admin/reservas` sin
  sesión dan 401.
- `/admin` con la cuenta `admin`: Sesiones, Reservas, la hoja de control de la sesión 1, Usuarios y
  Pedidos cargan sin errores ni respuestas 4xx. La hoja de control muestra los cinco participantes
  con su casilla de entrada, los filtros y «Exportar CSV».
- Con la cuenta `ana`, `/sesiones/4/registro` muestra el total y el botón «Registrar asistencia ·
  12,00 €». `/sesiones#devoluciones` lleva a la política.
- `/` y `/sesiones` a 390, 912, 1280, 1536 y 1920: no hay desbordamiento ni errores de consola.
- **No se probó en el navegador:** el paso por Stripe Checkout, marcar entradas, revisar, reactivar ni
  exportar, porque todo escribe en la base. Lo cubren las pruebas del backend.

## Migraciones

Aplicar en otras bases **antes** de arrancar esta versión, en este orden (las tres son idempotentes):

1. `reto-eventos-backend/migraciones/2026-10-17-reservas-pago.sql`
2. `reto-eventos-backend/migraciones/2026-10-17-control-ingreso.sql`
3. `reto-eventos-backend/migraciones/2026-10-17-revision.sql`

Antes, si faltan, las del 14 al 17 de octubre (la última, `reservas-cancelacion`).

## Pendientes e incoherencias observadas

1. **Stripe en producción:** el cobro de reservas usa el mismo webhook que la tienda. Lo de
   `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` y `TIENDA_URL` sigue pendiente
   ([guia-despliegue.md](../guia-despliegue.md)).
2. **Reservas de prueba en local:** con el backend compartido cobrando en modo prueba, una reserva
   hecha desde la web se queda pendiente de pago 30 minutos si no se paga con una tarjeta de prueba.
3. **Tamaños de CSS:** `home-foundation.css` (47,03 kB) y `locations-layout.css` (47,13 kB) siguen a
   menos de 1 kB del error de 48 kB. `sessions-shell.css` sube a 30,52 kB. El paquete inicial está
   en 748,97 kB.
4. `mini-codex` sigue sin dejar nota de merge.
