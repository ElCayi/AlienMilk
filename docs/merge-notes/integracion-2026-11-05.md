# Entrega de la integración — 5 de noviembre de 2026

## Incorporado

- `claude` (`48c47c2`, `403730c`, `5e9dd78`): la maqueta de móvil de Nosotros (bandas de transición,
  «Leer más», tren de etapas en bucle, fotos con las etiquetas dentro y una foto nueva solo para
  móvil), el héroe de escritorio 40 px más abajo y sin el hilo de tinta sobre Próximas sesiones. El
  rótulo de Nosotros y su entrada del menú pasan a «Dedicados a lo que nos une». Detalle en
  [rama-claude.md](rama-claude.md).
- `mini-codex` (`067a9e5` … `2619336`, 35 commits), sin nota de merge; lo resumido sale de sus
  commits y de [guia-despliegue.md](../guia-despliegue.md):
  - **Reservas:**
    - cada devolución con su propio registro;
    - reservas por teléfono sin cuenta;
    - borrar una cuenta conserva su historial;
    - la web cierra las reservas 40 minutos antes y no deja entrar con un pago pendiente;
    - la ficha se abre en un panel lateral, con `?ficha=` en la dirección;
    - «Requiere revisión» pasa a «Por revisar» y se cierra con una ✕.
  - **Sesiones:** la edición en lote se abre en un diálogo y dice en qué sesiones está cada
    diferencia. Se puede previsualizar la página pública antes de guardar, y solo se borra una sesión
    que nunca tuvo reservas.
  - **Panel:**
    - «Visión general» como entrada (`/admin/resumen`);
    - una barra de filtros común;
    - diálogos que se maximizan;
    - la hoja de control en un diálogo;
    - las introducciones, en un botón de ayuda junto al título;
    - recuadros blancos con trazo gris azulado.
- `clos`, `MegaClos` y `mini-codex2`: sin commits nuevos.

## Decisiones de merge

Orden `claude` → `mini-codex`, con `--no-ff`. `git merge-tree` no dio conflictos y las ramas no
tocan los mismos archivos. Lo que `claude` tenía sin commitear en `app.ts` el 17 de octubre se funde
solo con la entrada «Devoluciones» de `mini-codex`.

Las reglas de móvil de Nosotros viven ahora en `about-page.mobile.css`; si otra rama toca ese móvil en
el CSS antiguo, hay que llevarlo allí.

## Comprobaciones

- `pnpm check`: lint, 38 pruebas y build de producción correctos.
- `./mvnw -q test`: 143 pruebas correctas (antes 132).
- Base compartida: copia previa en `~/.local/share/alienmilk-backups/reserva_eventos-antes-2026-11-05.sql`,
  fuera del repositorio. Las dos migraciones nuevas ya estaban de hecho aplicadas (tabla y columnas
  presentes, ninguna devolución anterior) y volver a pasarlas no cambió nada.
- Backend compartido reiniciado en `b6d12f6`. Sesiones activas, expediente y red de confianza dan 200;
  `/api/reservas` y `/api/admin/reservas` sin sesión dan 401; el catálogo dice `pagoConTarjeta: true`.
- Navegador: `/nosotros` a 360, 390, 430, 912, 1280, 1536 y 1920, `/` a 390, 912, 1280, 1536 y 1920, y
  `/sesiones`, `/tienda` y `/contacto` a 390, 912 y 1536. No hay desbordamiento horizontal ni errores
  de consola.
- `/admin` con la cuenta `admin`: las once rutas (Visión general, Sesiones, Reservas, la hoja de
  control, Tipos, Usuarios, Perfiles, Pedidos, Solicitudes, Contacto y Demo) cargan sin errores ni
  respuestas 4xx.
- Panel lateral de Reservas: abrir la ficha, ir a Sesiones por el menú, atrás, adelante y atrás
  devuelven la ficha `?ficha=r-4` y Sesiones como toca.
- Revisados a ojo: Visión general y la ficha (1536), Nosotros en móvil (`#trabajo` y `#archivo`, 390)
  y el héroe (1536).
- **No se probó:** el tren de etapas en marcha ni abrir y cerrar «Leer más», y ninguna acción que
  escriba: devoluciones, reservas sin cuenta, edición en lote, cerrar una revisión ni «Restaurar demo».
  Lo que es de backend lo cubren sus pruebas. A 912 y a 1536 no se miró a ojo que el robot recortado
  de Nosotros siga igual.

## Migraciones

Aplicar en otras bases **antes** de arrancar esta versión, en este orden (son idempotentes):

1. `reto-eventos-backend/migraciones/2026-10-17-devoluciones.sql`
2. `reto-eventos-backend/migraciones/2026-10-17-reservas-sin-cuenta.sql`

Antes, si faltan, las del 14 al 17 de octubre (la última, `revision`).

## Pendientes e incoherencias observadas

1. **Fallo por reproducir:** «atrás» y luego «adelante» en el panel lateral, que se dijo que hacía
   desaparecer la ficha. En el recorrido de arriba no pasa, con el backend ya al día. Faltan los pasos
   exactos si vuelve a verse. Abrir una ficha reemplaza la entrada del historial, así que «atrás» desde
   una ficha abierta sale de Reservas; conviene confirmar que es lo que se quiere.
2. **Tamaños de CSS:** `home-foundation.css` (47,05 kB) y `locations-layout.css` (47,13 kB) siguen a
   menos de 1 kB del error de 48 kB. `about-page.component.css` sigue en 45,74 kB y `panel.css` pasa
   por primera vez el aviso de 20 kB (26,60 kB). El paquete inicial está en 751,11 kB.
3. `mini-codex` sigue sin dejar nota de merge.
4. Siguen abiertos los pendientes de las entregas anteriores, entre ellos la letra al 180 % en tableta
   fuera de la portada.
