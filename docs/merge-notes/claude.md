# Notas de merge — rama `claude`

Tanda del 10 de octubre de 2026, sobre `main` en `e3eedad`.
Comprobado el 10 de octubre tras actualizar `origin`:
- `pnpm check` en verde (lint, 29 pruebas y build).
- Todas las ramas remotas siguen en `e3eedad`.
- `git merge-tree --write-tree` no da conflictos con `clos` local (`a663201`, sin subir).

## Qué trae

### Portada

- **AlienMilk Distribution** (`features/distribution/`), sección nueva entre Localizaciones y
  Collaborators. Sigue las notas de JT: un anuncio de marca de lujo, no un bloque de tienda.
  - **Cabecera** con el formato de las demás secciones: barra, rótulo «Distribución gastronómica ·
    2026», la firma «AlienMilk Distribution», el subtítulo en coral y la entradilla.
  - **Parte oscura**, que abre el anuncio. La foto nace de la tinta y el texto va abajo a la derecha:
    el titular en Barlow Condensed, la frase en Nunito coral y la letra pequeña.
  - **Foto:** `alienmilk-distribution-gallery.webp`, nueva; hay que subirla con la sección.
  - **«Para una primera cata»:** tres productos de la tienda (liquen, kéfir y copa), con su muestra,
    procedencia, resumen y lote. Sin precios.
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

- **`clos`:** su commit local toca Nosotros y sus notas; no se pisa con nada de esta tanda.
- **`MegaClos`:** tiene sin commitear los pedidos de invitado de la tienda. En `shop.service.ts`,
  `shop-shared.css` y `api.models.ts` solo añade cosas.
  - Distribution usa `catalog()`, `.sample` y `[data-tone]`, que no cambian.
  - Al fusionar, `shop-shared.css` crece; Distribution la carga, así que conviene mirar el aviso de
    tamaño de hojas en el build.

## Después del merge, comprobar

1. `pnpm check`. El paquete inicial está en unos 610 kB: sigue el aviso de 500 kB, lejos del error de
   1 MB.
2. **`/`** a 390, 1280×720, 1536×750 y 1920×1080:
   - Próximas sesiones → Localizaciones, sin corte y con las curvas del cambio de subsección.
   - Distribution: el texto del anuncio no tapa la sala rosa del fondo, los tres productos salen del
     catálogo y el corte bajo el bloque oscuro casa con sus esquinas.
   - Collaborators conserva unos 110 px de blanco sobre su barra.
3. **Imágenes:** subir `alienmilk-distribution-gallery.webp`. Las cuatro `alienmilk-closing-*.webp`
   siguen sin usarse y fuera de los commits.

## Pendiente, de antes

En móvil, a 390 px, los párrafos de Localizaciones y Collaborators (el mismo componente) son unos
39 px más anchos que la pantalla y se cortan por la derecha.
