# Notas de merge — rama `claude`

Tanda del 10 y 11 de octubre de 2026, sobre `main` en `e3eedad`.
Comprobado el 11 de octubre tras actualizar `origin`:
- `pnpm check` en verde (lint, 29 pruebas y build).
- `main` sigue en `e3eedad`.
- `git merge-tree --write-tree` no da conflictos con `origin/clos` (`a663201`) ni con
  `origin/MegaClos` (`8c63082`).

## Qué trae

### Portada

- **AlienMilk Distribution** (`features/distribution/`), sección nueva entre Localizaciones y
  Collaborators. Sigue las notas de JT: un anuncio de marca de lujo, no un bloque de tienda.
  - **Cabecera** con el formato de las demás secciones: barra, rótulo «Distribución gastronómica ·
    2026», la firma «AlienMilk Distribution», el subtítulo en coral y la entradilla.
  - **Parte oscura**, que abre el anuncio: solo la foto, que nace de la tinta y se funde en ella, sin
    texto encima.
  - **Foto:** `alienmilk-distribution-gallery.webp` (la galería en tonos coral), nueva; hay que subirla
    con la sección.
  - **«Para una primera cata»:** tres productos de la tienda (liquen, kéfir y copa), con procedencia,
    resumen y lote. Sin precios.
  - **Muestras:** en vez del círculo de la tienda, una molécula en SVG sobre una placa: el cultivo de
    la cabecera de Nosotros reducido a su forma, con el tono del producto. El brote se aleja y vuelve
    despacio; quieta con `prefers-reduced-motion`.
  - **Datos:** llegan de `/api/tienda/catalogo` (`ShopService.catalog()`). Si no responde, se ven los
    tres del catálogo inicial.
  - **Enlace:** uno solo, «Descubrir la tienda».
- **Próximas sesiones y Localizaciones**, fusionadas como una sola sección: entre ellas ya no hay
  corte de textura. El cambio de subsección es el mismo que en «Cómo colaborar»: a la izquierda, el
  blanco acaba en curva sobre la tinta; a la derecha, la tinta sube en curva.
- **Cambios de subsección** algo más redondeados, con `clamp(5rem, 9vw, 9.5rem)`, en los tres sitios:
  Localizaciones, Distribution y «Cómo colaborar».
- **Espaciados igualados** a unos 6vw (`clamp(3.75rem, 6vw, 7rem)`):
  - de las tarjetas de sesiones a la tinta;
  - de la tinta al título de Localizaciones;
  - del final del planetario a «Información al asistente».
  - Además: más aire bajo los (+) del planetario, bajo la barra de Discreción y antes de la tarjeta
    del cierre.

### Fondo (`liquid-backdrop.component.ts`)

- **Sin el primer corte.** `uInkTop` marca dónde empieza la tinta de Localizaciones, con las esquinas
  del cambio de subsección (`uJoinRound`).
- **`uDepthCut4`:** corte tras el bloque oscuro de Distribution (`data-backdrop-split`), en la otra
  diagonal, como entre Collaborators y la red de confianza.
- **Grosor de los cortes:** ya no depende del hueco entre las dos primeras secciones; es siempre
  `2 × 2,4vw`, entre 48 y 96 px.

## Posibles choques

- **`clos`:** su commit toca Nosotros y sus notas; no se pisa con nada de esta tanda.
- **`MegaClos`:** trae los pedidos de invitado de la tienda. En `shop.service.ts`,
  `shop-shared.css` y `api.models.ts` solo añade cosas.
  - Distribution usa `catalog()` y `[data-tone]`, que no cambian.
  - Al fusionar, `shop-shared.css` crece; Distribution la carga, así que conviene mirar el aviso de
    tamaño de hojas en el build.

## Después del merge, comprobar

1. `pnpm check`. El paquete inicial está en unos 610 kB: sigue el aviso de 500 kB, lejos del error de
   1 MB.
2. **`/`** a 390, 1280×720, 1536×750 y 1920×1080:
   - Próximas sesiones → Localizaciones, sin corte y con las curvas del cambio de subsección.
   - Distribution: los tres productos salen del catálogo, las moléculas se mueven y el corte bajo el
     bloque oscuro casa con sus esquinas.
   - Collaborators conserva unos 110 px de blanco sobre su barra.
3. **Imágenes:** subir `alienmilk-distribution-gallery.webp`. Las cuatro `alienmilk-closing-*.webp`
   siguen sin usarse y fuera de los commits.

## Tanda del 12 y 13 de octubre: la portada en móvil

Commits `592cef2` y el siguiente, sobre `650e01b`. Comprobado el 13 de octubre:
- `pnpm check` en verde (lint, 29 pruebas y build).
- `origin/main` sigue en `e3eedad`.
- `git merge-tree --write-tree` no da conflictos con `origin/clos` (`415bc4f`) ni con
  `origin/MegaClos` (`ff504f7`).

Todo es de móvil y tableta (hasta 1000 px, algunas cosas hasta 600). El escritorio no cambia, salvo
donde se dice.

### Lenguaje común

- **Bandas de tinta de borde a borde** con las esquinas en diagonal y uniones en curva (el blanco
  acaba en curva arriba a la izquierda; la tinta baja en curva abajo a la derecha). Las uniones son
  pseudoelementos con `radial-gradient`, solapados 1–3 px con la banda. Las hojas globales ocultan
  los rellenos de `[data-backdrop-ink-filler]`, así que van con un selector más largo.
  - Localizaciones, la selección de Distribution, «Cómo colaborar» y la franja de la red de
    confianza (distinciones, cinta de socios y cifras).
- **Carruseles nativos** con scroll-snap y puntos debajo: sesiones, planetario, productos de
  Distribution y pasos de «Cómo colaborar».
- **Aire estándar en móvil:** unos 50 px entre texto y bloque.

### Por sección

- **Héroe:** los iconos responden al toque; «Copiar enlace» destella en blanco como el corazón.
- **Próximas sesiones:** una ficha por sesión en una pista deslizable, con el marco de escritorio, la
  ficha técnica plegada (botón «Características») y el enlace «Explorar todas las sesiones» al final.
- **Localizaciones:** banda de tinta; el planetario en una ventana blanca, en carrusel, con los datos
  plegados de las demás estaciones al cambiar; «Antes de su visita» con más aire y letra mayor.
- **Distribution:** la selección en banda de tinta y en carrusel; la foto se funde arriba y abajo.
- **Collaborators:**
  - La foto del equipo, 5:6, con la forma de la ventana del planetario y el pie pegado debajo.
  - El gancho, en dos fichas plegables (`<details>`): «comunidad.» en blanca y «Gratis.» en tinta.
    En escritorio siguen abiertas siempre (`::details-content`).
  - «Cómo colaborar»: los pasos en tarjetas, en carrusel, con el título en dos líneas. Al pulsar la
    muestra se amplía en un `<dialog>` (en móvil y en escritorio).
  - **Texto:** el subtítulo pasa a «Participar es muy sencillo.» (también en escritorio).
- **Red de confianza:** la destacada, centrada y más grande; el palmarés, con franjas a su alto; la
  cinta de socios, sobre la textura líquida como imagen fija (en móvil el fondo animado no se pinta).
- **Botones de cierre** («Descubrir la tienda», «Cuéntenos su propuesta.», «Consultar
  documentación»): a 1,35rem.

### Después del merge, comprobar

1. **`/` a 390 y a 768:** que las curvas de las bandas casen sin rayas y que los carruseles lleguen
   al último elemento con su filo entero.
2. **`/` en escritorio (1536×750):** Collaborators con las dos columnas abiertas y «Cómo colaborar» sin
   puntos ni tarjetas.
3. **Imágenes:** las cuatro `alienmilk-closing-*.webp` siguen sin usarse y fuera de los commits.
4. **Safari:** el `<dialog>` de las muestras se cierra pulsando la imagen; pulsando fuera
   (`closedby`) solo en Chrome y Firefox.

## Tarde del 13 de octubre: final de la portada en móvil

- **Cinta de socios:** sin rayas (en móvil la tinta la pinta el CSS, no el fondo líquido), con un
  velo oscuro leve bajo las marcas; «El resto prefiere no figurar», debajo de la cinta y entre dos
  barras (≤600).
- **Experiencias:** citas a 1,75rem y firma a 0,78rem (≤1000).
- **Discreción:** título a 2,3rem, justificado y en varias líneas; la frase de cierre, en tarjeta
  blanca con filo de tinta (≤1000).
- **Cierre (`app-closing-cta`):** en la portada, de borde a borde, en la tinta del pie y pegado a
  él, con la curva de entrada de las bandas; la imagen remata la página, recortada por los lados y
  fundida bajo el texto (≤800). La tarjeta compartida gana variables (`--closing-cta-bleed`,
  `-pad-x`, `-radius`, `-shadow`, `-ink`, `-stack-image`, `-stack-focus`, `-stack-overlap`,
  `-stack-fade`) con sus valores de siempre por defecto: Sesiones no cambia.
- **Comprobar tras el merge:** el cierre de `/sesiones` en móvil sigue igual.
