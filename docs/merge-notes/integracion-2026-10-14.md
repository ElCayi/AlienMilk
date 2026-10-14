# Entrega de la integración — 14 de octubre de 2026

## Incorporado

- `clos` (`06f4856`): el título de la puerta del CTA final de Nosotros, un 10 % más grande
  (`--door-title-scale`).
- `claude` (`2549c68`, `ab3de90`, `c9e516e`): segunda y tercera tanda de tableta (la raíz pasa del
  150 % al **180 %** entre 901 y 1000 px; héroe, intro, sesiones, estaciones, «Cómo colaborar» y
  Distinciones recalculados), desplegables que bajan hasta verse enteros, flechas del menú más
  grandes en hamburguesa, la tinta del fondo líquido al paso del scroll y las notas renombradas a
  `rama-claude.md`.
- `MegaClos` (`af3a1bc` … `f399f6a`): cuatro tarjetas de producto por pantalla en móvil y tableta,
  política de anulaciones y devoluciones bajo el pedido (con su entrada «Devoluciones» en el
  desplegable de Tienda), historial del pedido plegable y un correo al comprador en cada cambio del
  pedido. Sin nota de merge; detalle en [tienda.md](../tienda.md).
- `mini-codex` (`5ca6cdd`, `27c2a06`): expedientes de las sesiones en la base y editables desde
  `/admin` (sale `public/data/session-dossiers.json`), foto propia de cada sesión, archivo de
  sesiones, cierre nocturno de las sesiones pasadas (`CierreSesiones`) y la sección Demo con
  «Restaurar el estado de fábrica» (`FabricaService`, `scripts/fabrica.sh`). Sin nota de merge; lo
  resumido sale de sus commits y de [guia-despliegue.md](../guia-despliegue.md).
- `mini-codex2`: sin cambios.

## Decisiones de merge

Orden `clos` → `claude` → `MegaClos` → `mini-codex`, con `--no-ff`. `git merge-tree` no dio
conflictos en ninguna pareja. `claude` y `mini-codex` coinciden en `styles.css` y
`home-editorial.css`, pero en reglas distintas; la fusión automática conserva las dos.

Arreglo propio, `b1d7720`: la cabecera escondía el nombre de la cuenta hasta 1520 px, un umbral
calculado antes de las flechas de los desplegables. Con sesión iniciada, a 1536 «Contacto ⌄» se
montaba 16 px sobre «Administrador · Admin» (31 px con un pedido de dos cifras). Ahora se esconde
hasta 1660, y a 1661 quedan 46 px de aire. Venía de la integración anterior.

Las cuatro `alienmilk-closing-*.webp` siguen sin versionar en el worktree de `claude`. El vídeo de
Getty sigue fuera de Git.

## Comprobaciones

- `pnpm check`: lint, 33 pruebas en 8 archivos y build de producción correctos.
- `./mvnw -q test`: 101 pruebas correctas (antes 78).
- Base compartida: aplicadas las tres migraciones del 14 de octubre (solo faltaba la columna
  `archivada`). Backend compartido reiniciado en `a83692b`. `/api/eventos/activos` (4 sesiones),
  `/api/eventos/expedientes`, catálogo y red de confianza dan 200; `/api/admin/*` sin sesión da 401.
- Navegador: `/`, `/sesiones`, `/nosotros`, `/tienda` y `/contacto` a 390×844, 912×1368, 1280×720,
  1536×750 y 1920×1080. No hay desbordamiento horizontal en ninguna. El único error de consola es el
  aviso de `ResizeObserver loop` de la portada, inofensivo.
- `/sesiones` pide `/api/eventos/expedientes` y pinta el expediente de la Cata (equipo, procedencia,
  preguntas), ya desde la base.
- `/admin` con la cuenta `admin`: las nueve secciones (Sesiones, Reservas, Tipos, Usuarios, Perfiles,
  Pedidos, Solicitudes, Contacto y Demo) cargan sin errores ni respuestas 4xx, también a 390. Los
  filtros de sesiones muestran «Archivadas». **No se pulsó** nada que escriba, ni «Restaurar» en Demo.
- Revisados a ojo: devoluciones de la tienda (1536 y 390), catálogo en móvil, la puerta de Nosotros
  (1536) y la portada a 912.

## Migraciones

Aplicar en otras bases **antes** de arrancar esta versión, en este orden. Las tres son idempotentes:

1. `reto-eventos-backend/migraciones/2026-10-14-sesiones-fechas.sql`: mueve las sesiones de ejemplo
   seis meses adelante. Sin ella, el cierre nocturno las daría todas por terminadas.
2. `reto-eventos-backend/migraciones/2026-10-14-expedientes-fotos.sql`
3. `reto-eventos-backend/migraciones/2026-10-14-sesiones-archivo.sql`

Siguen pendientes en producción las de la tienda (del 9 al 13 de octubre) y volver a aplicar
`2026-10-07-red-confianza.sql`. Además, en producción hay que crear
`/opt/reto-eventos/datos/imagenes-sesiones` con permiso de escritura para `www-data`; ver
[guia-despliegue.md](../guia-despliegue.md).

## Pendientes e incoherencias observadas

1. **Tableta al 180 % en todas las páginas.** A 912 la Tienda se rompe: en «Condiciones», las fichas
   se solapan con su texto (precio y «Desde 40,00 €» encima). Contacto queda muy apretado en
   «Recepción y visitas» (el recuadro del horario, a pocas palabras por línea). Con el 150 % ya se
   anotaron fallos en esas páginas y en el índice de Nosotros. La portada se ve bien.
2. **«Restaurar» de Demo** borra pedidos, solicitudes, fotos y todo lo creado en la base. En local
   la base es compartida por todos los worktrees: pulsarlo afecta a todos.
3. **Correo de pedidos:** cada cambio de un pedido intenta avisar al comprador. Sin SMTP configurado
   no sale nada, como el resto de avisos.
4. **Fotos de las sesiones:** `backup-db.sh` no copia `datos/imagenes-sesiones`.
5. **Tienda en móvil:** en las tarjetas oscuras de devoluciones, el texto justificado abre huecos a
   390 («Son perecederos: una vez…»). Iría mejor con `text-justify: inter-character`.
6. El paquete inicial sube a 746,30 kB (antes 741,54 kB).
7. `MegaClos` y `mini-codex` no dejaron nota de merge.
8. Siguen abiertos los pendientes de las entregas anteriores que no toca esta tanda.
