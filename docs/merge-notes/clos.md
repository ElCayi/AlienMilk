# Notas de merge — rama `clos`

Tandas del 10 al 12 de octubre de 2026, sobre `main` en `e3eedad`. Las notas anteriores de esta rama
ya están integradas (la última, en la integración del 9 de octubre); quedan en el historial de git.

## Qué trae: los textos definitivos y las fotos de la 02 y la 03 de Nosotros

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
  (`public/alienmilk-about-laboratory.webp`, 1145×1374, recortado con transparencia), por delante,
  un 5 % mayor que su recuadro y colgado de la franja de encima. Salen el hueco «Imagen pendiente ·
  Sesión», la ficha de la alícuota y la tarjeta de «Programas» (con sus enlaces a Sesiones y
  Contacto).
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

## Posibles choques

- `about-page.component.html` y `.css`. Si otra rama toca Nosotros, **manda la versión de `clos`** y
  lo de la otra se reaplica encima.
- El CSS de Nosotros queda por debajo del error de 48 kB (sigue el aviso de 20 kB).

## Después del merge, comprobar

1. `pnpm check` (29 pruebas).
2. `/nosotros` a 390, 1280×720, 1536×750 y 1920×1080:
   - Las cuatro partes de la 02 y la 03 miden lo mismo; el texto se desplaza dentro, con el fundido
     abajo, y el fundido desaparece al final. En móvil todo se lee entero.
   - La franja de la equivalencia mide lo que la de la 02 y enlaza sin hueco con los recuadros
     oscuros.
   - El biorreactor llena su recuadro; el manipulador va entero, sin rectángulo negro alrededor.
