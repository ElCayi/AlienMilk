# Entrega de la integración — 13 de octubre de 2026

## Incorporado

- `clos` (`a663201`, `415bc4f`, `33a875f`): textos definitivos de la 02 y la 03 de Nosotros,
  biorreactor y manipulador robótico, franja de equivalencia del lote, recuadros claros de alto fijo
  con desplazamiento interno y la arquitectura ejecutiva acabada (pestañas de carpeta y esquema de
  la célula).
- `claude` (`4586e93` … `0aa02cd`): AlienMilk Distribution en la portada, Próximas sesiones y
  Localizaciones fusionadas, espaciado igualado y la portada en móvil (bandas de tinta, carruseles
  con scroll-snap, Collaborators plegable y el diálogo de las muestras).
- `MegaClos` (`8c63082` … `ff504f7`): compra como invitado con enlace privado, pago con Stripe
  Checkout (entorno de prueba), gestión de pedidos en `/admin`, buscador y condiciones en chips en la
  tienda, y el formulario de propuesta de Collaborators en lugar del `mailto`. Detalle en
  [tienda.md](../tienda.md) y [formularios.md](../formularios.md).
- `mini-codex` y `mini-codex2`: sin cambios desde la integración del 9 de octubre.

## Decisiones de merge

Orden `clos` → `claude` → `MegaClos`, con `--no-ff`. `git merge-tree` no dio conflictos en
ninguna pareja. `claude` y `MegaClos` coinciden en el cierre de «Cómo colaborar»
(`locations-atlas.component.html`, `.ts` y `locations-collaboration-how.css`), y la fusión
automática es la buena. El botón «Cuéntenos su propuesta.» de `MegaClos`, que abre
`app-request-dialog` con `collaborators-propuesta`, sustituye al enlace `mailto`. Conserva el
estilo y los tamaños que le dio `claude`, porque las reglas van por clase y no por etiqueta.
Las cuatro `alienmilk-closing-*.webp` siguen sin versionar en el worktree de `claude`. El vídeo de
Getty sigue fuera de Git.

## Comprobaciones

- `pnpm check`: lint, 33 pruebas en 8 archivos y build de producción correctos.
- `./mvnw -q test`: 59 pruebas correctas. Los `ERROR` del registro son de `AvisoSolicitudesTest`,
  que provoca los fallos de SMTP a propósito.
- Backend compartido reiniciado en `18f80dd`. Red de confianza, catálogo y la definición
  `collaborators-propuesta` dan 200. La consulta de invitado sin clave da 404 y
  `/api/admin/pedidos` sin sesión da 401. `pagoConTarjeta: false`: el backend compartido no tiene
  clave de Stripe.
- Navegador: `/`, `/nosotros`, `/tienda` y `/contacto` a 390×844, 768×1024, 1280×720, 1536×750 y
  1920×1080. No hay desbordamiento horizontal en ninguna. El único error de consola es un aviso de
  `ResizeObserver loop` en la portada a 390 y 768, inofensivo.
- «Cuéntenos su propuesta.» (portada, a 1536 y a 390) y «Proponer una muestra» (pie) abren el
  diálogo con sus 7 campos, que se cierra con Escape.
- Distribution pinta los tres productos del catálogo (liquen, kéfir y copa).
- El buscador de la tienda ignora tildes: «kefir» deja solo el Kéfir de Tau Ceti.
- Las cuatro pestañas de la arquitectura se seleccionan, con un solo panel visible y su capa del
  esquema encendida.
- Revisados a ojo «Cómo colaborar» (1536 y 390), Distribution (1536) y la arquitectura con la 02
  abierta (1536).
- **No se probó en el navegador:** el panel de pedidos de `/admin` ni el pago con Stripe. Los cubren
  las pruebas de contrato del backend; el pago necesita clave de prueba (ver
  [tienda.md](../tienda.md#probarlo-en-local)).

## Migraciones

Aplicar en otras bases antes de arrancar esta versión, en este orden. Las cuatro son idempotentes:

1. `reto-eventos-backend/migraciones/2026-10-09-tienda.sql`, si no se aplicó con la entrega anterior.
2. `reto-eventos-backend/migraciones/2026-10-10-tienda-invitados.sql`
3. `reto-eventos-backend/migraciones/2026-10-12-tienda-pagos.sql`
4. `reto-eventos-backend/migraciones/2026-10-13-tienda-envios.sql`

En producción sigue pendiente, además, volver a aplicar `2026-10-07-red-confianza.sql` (entrega del
9 de octubre). La base local compartida ya tiene las columnas de invitados, pago y envío. No se
ejecutó el script de recreación.

## Pendientes e incoherencias observadas

1. **Paquete inicial:** sube a 719,44 kB (antes 590,55 kB; `claude` sola rondaba los 610). La
   portada se carga de entrada, y esta tanda le suma Distribution, los carruseles de móvil y el
   diálogo de solicitudes (`RequestDialogComponent` en `locations-atlas`). Sigue lejos del error de
   1 MB. Si se quiere recortar, lo primero sería un `@defer` en el diálogo.
2. **Tamaños de CSS:** Ubicaciones 47,22 kB (a 0,78 kB del error de 48 kB), Portada 44,95 kB,
   Nosotros 44,72 kB, Contacto 24,11 kB. `trust-network.component.css` pasa por primera vez el
   aviso de 20 kB (21,56 kB).
3. **Stripe en producción:** hacen falta `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` y
   `TIENDA_URL` en el `EnvironmentFile`, y el destino del webhook en Stripe
   ([guia-despliegue.md](../guia-despliegue.md)). Sin clave, la tienda confirma sin cobrar.
4. **Correo:** los pedidos de invitado aún no mandan el enlace privado por correo, y la propuesta de
   Collaborators se queda en la bandeja hasta configurar el SMTP.
5. **Safari:** el `<dialog>` de las muestras de «Cómo colaborar» solo se cierra pulsando fuera en
   Chrome y Firefox (`closedby`). En Safari se cierra pulsando la imagen. Lo señala `claude`.
6. Siguen abiertos los pendientes de las entregas del 7 y el 9 de octubre que no toca esta tanda.
