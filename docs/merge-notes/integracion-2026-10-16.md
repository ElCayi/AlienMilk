# Entrega de la integración — 16 de octubre de 2026

## Incorporado

- `mini-codex` (`cc5cbfa` … `02e16dc`, 10 commits), sin nota de merge; lo resumido sale de sus
  commits y de [guia-despliegue.md](../guia-despliegue.md):
  - **Registro de asistencia** al reservar (`/sesiones/:id/registro`): un participante por plaza,
    con credencial, procedencia e incompatibilidades. También teléfono para avisos del mismo día,
    adaptaciones, material externo, conformidad (edad mínima y condiciones) y si se quiere recibir
    el programa.
  - **Cierres:** las reservas cierran con la entrada (10 minutos antes) y se cancelan hasta el día
    anterior. Las sesiones terminan según su duración.
  - **`/admin`:**
    - el panel de reservas, como el de sesiones, con reservas de demostración y el filtro
      «Requieren revisión»;
    - la **hoja de control de ingreso** imprimible (`/admin/sesiones/:id/control`), con su parte
      para sala;
    - números de tres cifras (001);
    - cambiar el propio nombre desde el saludo.
  - **Mi panel:** los participantes de cada reserva.
- `claude`, `clos`, `MegaClos` y `mini-codex2`: sin commits nuevos. `claude` tiene cambios sin
  commitear (`liquid-backdrop.component.ts`, `about-page.component.css` y `home-responsive.css`), que
  no entran.

## Decisiones de merge

`mini-codex` con `--no-ff` sobre `75cdc14`. `git merge-tree` no dio conflictos. La rama añade a
`styles.css` una regla `@media print` que oculta la barra, el menú y el pie solo cuando la página
tiene `.control-sheet`; no afecta al resto.

## Comprobaciones

- `pnpm check`: lint, 35 pruebas y build de producción correctos.
- `./mvnw -q test`: 113 pruebas correctas (antes 101).
- Base compartida: aplicada `2026-10-16-reservas-asistencia.sql`. Backend compartido reiniciado en
  `f201ea4`. `/api/eventos/activos`, `/api/eventos/1/expediente`, el catálogo y la red de confianza
  dan 200. `/api/reservas` y `/api/admin/reservas` sin sesión dan 401.
- `/admin` con la cuenta `admin`: las diez secciones y la hoja de control de la sesión 1 cargan sin
  errores ni respuestas 4xx. Revisados a ojo el panel de reservas y la hoja de control (1536).
- Mi panel con la cuenta `ana`: Reservas, Pedidos y Mi cuenta, sin errores. Las dos reservas salen
  con «Sin registrar» en participantes.
- `/sesiones/4/registro`, con Ana: el formulario pinta sus once campos y se ve bien a 1536 y a 390.
  **No se envió ninguna reserva** ni se pulsó Cancelar.
- `/` y `/sesiones` a 390, 912, 1280, 1536 y 1920: no hay desbordamiento horizontal. El único error
  de consola es el aviso de `ResizeObserver loop` de la portada, inofensivo.

## Migraciones

Aplicar en otras bases **antes** de arrancar esta versión:

1. `reto-eventos-backend/migraciones/2026-10-16-reservas-asistencia.sql` (idempotente).

Si no se aplicaron ya, antes van las del 14 de octubre (`sesiones-fechas`, `expedientes-fotos` y
`sesiones-archivo`) y la del 15 (`sesiones-hora`).

## Pendientes e incoherencias observadas

1. **El merge del 15 de octubre** (`75cdc14`, `mini-codex`: hora de inicio obligatoria, botón de
   sesiones de demostración, índice público centrado) no tiene entrega propia. Su migración
   `2026-10-15-sesiones-hora.sql` ya estaba aplicada en la base compartida.
2. **Tamaños de CSS:** `home-foundation.css` (47,03 kB) y `locations-layout.css` (47,13 kB) siguen a
   menos de 1 kB del error de 48 kB. El paquete inicial está en 748,92 kB.
3. **Las reservas anteriores no tienen participantes:** salen «Sin registrar» en Mi panel y en la
   hoja de control, como dice la migración.
4. `mini-codex` sigue sin dejar nota de merge.
5. Siguen abiertos los pendientes de las entregas anteriores, entre ellos la letra al 180 % en
   tableta fuera de la portada.
