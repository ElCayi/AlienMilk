# Entrega de la integración — 9 de octubre de 2026

## Incorporado

- `clos` (`5db79e9`): foto del Archivo en la 03 — 1 de Nosotros y banda al pie de la 02 con el
  destino de cada incorporación (Sesiones, Investigación, Archivo); chips de los recorridos más
  discretas.
- `claude` (`65f7ea7`, nota en `f584eff`): palmarés interactivo con «Síntesis», carrusel de 18
  experiencias, cinta de socios traslúcida, titulares de Collaborators y `premio.descripcion` en
  `/api/red-de-confianza`.
- `MegaClos` (`b247c45`, `550a7a1`): aviso por correo de cada solicitud (apagado hasta configurar
  SMTP) y `/tienda` con fichas, carrito, pedidos calculados en el servidor y anulación. Detalle en
  [tienda.md](../tienda.md) y [formularios.md](../formularios.md).
- `mini-codex` y `mini-codex2`: sin cambios desde la integración del 7 de octubre.

## Decisiones de merge

Orden `clos` → `claude` → `MegaClos`, con `--no-ff`. `git merge-tree` no dio conflictos en
ninguna pareja. `claude` y `MegaClos` tocan `script_bbdd.sql` y `api.models.ts`, pero se
fusionaron solos: los premios con descripción quedan antes de `solicitudes` y las tablas de la
tienda van al final. Las cuatro imágenes alternativas del cierre siguen sin versionar en el
worktree de `claude`, como el 7 de octubre. El vídeo de Getty sigue fuera de Git.

## Comprobaciones

- `pnpm check`: lint, 29 pruebas en 7 archivos y build de producción correctos.
- `./mvnw -q test`: 37 pruebas correctas, incluidas las nuevas de la tienda (8) y del aviso por
  correo (7).
- Backend compartido reiniciado en `ab6db60`. `/api/red-de-confianza` da 200, con los 9 premios
  con descripción, y `/api/tienda/catalogo` da 200, con 9 productos y sus condiciones (4,90 €, envío
  gratis desde 40 €, 6 unidades como máximo).
- Navegador: `/`, `/nosotros`, `/tienda` y `/tienda/leche-entera-ceto-iv` a 390×844, 1280×720,
  1536×750 y 1920×1080. No hay desbordamiento horizontal en ninguna. El único error de consola es un
  aviso de `ResizeObserver loop` en la ficha de producto a 390, inofensivo.
- Palmarés: las franjas cambian la destacada y la «Síntesis» se abre. El carrusel pasa solo de 01 a
  02 en unos 7 s. La tienda añade al carrito, y la cabecera muestra la cuenta. El queso de cueva
  sale sin botón porque tiene 0 existencias.
- Revisadas a ojo la banda de la 02 y la foto del Archivo (1536 y 390), el palmarés, las
  experiencias y la tienda en móvil.

## Migraciones

Aplicar en otras bases antes de arrancar esta versión:

- `reto-eventos-backend/migraciones/2026-10-07-red-confianza.sql`: **volver a aplicarla** aunque ya
  esté la del 7 de octubre. Añade `premio.descripcion`, renombra siglas y es idempotente.
- `reto-eventos-backend/migraciones/2026-10-09-tienda.sql`: `productos`, `pedidos` y
  `lineas_pedido` con el catálogo inicial.

La base local compartida ya tenía las dos: 9 premios con descripción y 9 productos. No se ejecutó
el script de recreación.

## Pendientes e incoherencias observadas

1. **Tamaños:** el CSS de Nosotros sube a 42,00 kB (antes 38,25 kB). Ubicaciones sigue en 47,35 kB,
   a 0,65 kB del error de 48 kB. El bundle inicial sube a 590,55 kB (antes 561,67 kB), con el aviso
   de 500 kB. La build pasa sin aumentar límites.
2. **Correo:** el aviso de solicitudes funciona contra Mailpit, pero en producción falta la cuenta
   SMTP (`SPRING_MAIL_HOST`, `AVISOS_CORREO_DESTINO` en el `EnvironmentFile`). Hasta entonces, la
   confirmación de los formularios sigue prometiendo una respuesta por correo que no se envía.
3. **Tienda:** es de demostración. No cobra nada, y los estados `ENVIADO` y `ENTREGADO` esperan un
   panel de administración. La cabecera colapsa el menú a 1200 px por el quinto enlace.
4. **Nosotros:** siguen pendientes las fotos de Laboratorio y Sesión (03 — 2 y 3). Las cifras del
   medidor son de prueba.
5. Siguen abiertos los pendientes de la entrega del 7 de octubre que no toca esta tanda: datos de
   reserva duplicados en la red de confianza, `X-Forwarded-For` en la limitación de envíos, los
   quince días de Kepler y la deuda anterior.
