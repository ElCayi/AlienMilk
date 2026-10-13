# Notas de merge — rama `clos`

Tandas del 10 al 13 de octubre de 2026, sobre `main` en `e3eedad`. Las notas anteriores de esta rama
ya están integradas (la última, en la integración del 9 de octubre); quedan en el historial de git.

## Qué trae (10–12 de octubre): los textos definitivos y las fotos de la 02 y la 03 de Nosotros

Todos los textos son de la usuaria, literales, con sus negritas.

- **02 — 1, «Del origen a la mesa.»:** cuatro párrafos nuevos (integración vertical, la red de
  explotaciones, el Archivo como núcleo y el compromiso).
- **02 — 2, «Bajo custodia.»:** tres párrafos nuevos (trazabilidad integral, transporte biológico y
  custodia ampliada, abastecimiento responsable). Sale el estilo `.us-work-name`, que ya no usa nadie.
- **La parte de en medio de la 03, «03 / El Archivo»:** título «Conservar lo imposible.», subtítulo
  «Distinción de Custodia Continuada.» y cuatro párrafos sobre los métodos de preservación. En el
  recuadro oscuro, el biorreactor (`public/alienmilk-about-bioreactor.webp`, 809×1942, 215 kB),
  girado en vertical, con la ficha del laboratorio.
- **03 — 3, «Del Archivo a la experiencia.»:** título, subtítulo «Producción, distribución y
  coleccionismo.» y dos párrafos. El título va en una línea con `appFitLine` (`[appFitLineMin]="32"`:
  en móvil se parte, como los demás). En el recuadro oscuro, el manipulador robótico
  (`public/alienmilk-about-laboratory.webp`, 1145×1374, recortado con transparencia), por delante y
  algo menor que su recuadro (con relleno); como la foto lo corta por arriba, ahí nace del negro con
  un fundido corto. Salen el hueco «Imagen pendiente · Sesión», la ficha de la alícuota y la tarjeta
  de «Programas» (con sus enlaces a Sesiones y Contacto).
- **La franja entre las dos partes de la 03:** en vez de las chips «Muestra primaria → … → Sesión»,
  la equivalencia del último lote frente al material de referencia (`dl.us-eco-equiv`): Proteómica,
  Lipidómica y Reología, cada una con su medidor (`--match`; cifras de prueba), la última en coral.
  Mide lo que la franja de la 02. El remate cóncavo de abajo cuelga ahora de `.us-chain >
  :last-child`, no del `ol`.
- **Recuadros claros de alto fijo** (escritorio): las cuatro partes de la 02 y la 03 miden
  `21.3em` (lo que medía la 02) y no crecen con el texto. Si el texto no cabe, se desplaza dentro del
  recuadro, con una barra fina y un fundido abajo que se va al llegar al final (`--us-more-fade`, con
  `animation-timeline: scroll(self)`). La 02 mide casi lo de antes (±9 px).
- **03 — 1:** la esquina de arriba a la derecha de la foto del Archivo se redondea en paralelo a la
  del recuadro claro de al lado.
- Ya no queda ningún hueco de foto pendiente en Nosotros: salen los estilos de `.us-eco-pending`.

## Qué trae (13 de octubre): la arquitectura ejecutiva de la 04, acabada, y el aire del equipo

Los textos siguen literales; solo se añaden guiones invisibles (`&shy;`) en la última palabra larga
de algunos párrafos, para que el justificado no abra huecos.

- **Pestañas de carpeta:** cuatro cajas del mismo ancho, en un tono apenas más claro que el bloque,
  con el número en coral delante del nombre, los dos en la condensada y a la izquierda. La abierta se
  perfila, toma el color del bloque y tapa la raya, abierta hacia su contenido. Se reparten según el
  ancho de su fila con *container queries* (el contenedor es `.us-arch-bar`): cuatro en fila, dos
  por fila o una por línea, como botones redondeados. El botón Desplegar/Replegar pasa debajo, a la
  derecha.
- **El esquema de la célula** (SVG en línea, `aria-hidden`): la organización dibujada como una
  célula. 01, la membrana; 02, el núcleo dentro de su envolvente (la IEA); 03, las vesículas con un
  trocito del núcleo (los SEA); 04, los filamentos y las instancias retiradas en discontinuo (el
  linaje). Con `[attr.data-layer]`, la parte de la capa abierta se enciende en coral.
- **Las capas:** se ve solo la abierta y el bloque mide lo que ella, sin huecos (cambia de alto al
  pasar de una a otra). El texto, en la columna ancha, con el primer párrafo de entradilla; el
  esquema, en la estrecha.
- **El cierre, «Diseñadas para operar a otra escala»:** el título en una línea (`appFitLine`); el
  texto, en la columna ancha; en la estrecha, arriba, la responsabilidad (o el principio) de la capa
  abierta y, al pie, la frase final en un recuadro del tono de las pestañas. En escritorio el cierre
  se deshace en la rejilla de las capas (`display: contents`, con el filete en un `::before`) y
  cada panel abarca sus filas con `grid-template-rows: subgrid`: la responsabilidad sigue dentro de
  su `tabpanel`. En móvil va tras el texto de su capa.
- **Aire:** abierto, al final del bloque, `clamp(3rem, 6vw, 7rem)` (la regla de la página); la lista
  de responsabilidad, más suelta.
- Salen los separadores verticales entre pestañas, la fila de `.us-arch-bar` con el botón al lado y
  las pestañas que se partían en dos líneas (≤600 px y 1001–1200 px).
- **El equipo, entre la 03 y la 04:** más aire arriba y abajo de la nota (`clamp(4.5rem, 11vw,
  11rem)`), un pelín menos abajo en escritorio para que a la vista quede igual.

## Posibles choques

- `about-page.component.html` y `.css`. Si otra rama toca Nosotros, **manda la versión de `clos`** y
  lo de la otra se reaplica encima.
- El CSS de Nosotros queda en unos 44,7 kB, por debajo del error de 48 kB (sigue el aviso de 20 kB).

## Después del merge, comprobar

1. `pnpm check` (29 pruebas).
2. `/nosotros` a 390, 1280×720, 1536×750 y 1920×1080:
   - Las cuatro partes de la 02 y la 03 miden lo mismo; el texto se desplaza dentro, con el fundido
     abajo, y el fundido desaparece al final. En móvil todo se lee entero.
   - La franja de la equivalencia mide lo que la de la 02 y enlaza sin hueco con los recuadros
     oscuros.
   - El biorreactor llena su recuadro; el manipulador va entero, sin rectángulo negro alrededor.
   - Arquitectura ejecutiva, plegada: las pestañas caben en una línea cada una (cuatro en fila desde
     unos 1180 px, dos por fila en tableta, una por línea en móvil).
   - Abierta, cada pestaña: se perfila y se abre hacia su texto, su parte del esquema va en coral, y
     en el cierre la responsabilidad queda arriba de la columna estrecha y la frase en su recuadro al
     pie, sin pisarse. Sin hueco entre el texto de la capa y el filete del cierre.
