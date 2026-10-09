# Notas de merge — rama `clos`

Tanda del 8 y el 9 de octubre de 2026, sobre `main` en `029584c`. Las notas anteriores de esta rama ya
están integradas (la última, `b1579ad`, en la integración del 7 de octubre); quedan en el historial de
git.

## Qué trae: el paso de la 02 a la 03 de Nosotros

- **Foto del Archivo** en la 03 — 1 (`public/alienmilk-about-archive.webp`, 165 kB): viales
  iridiscentes con las etiquetas AM-2291-F, R17 y AlienMilk. La etiqueta «Fideldad» de un vial, que
  salió con artefactos, está borrada en la foto. Va casi a su brillo natural y nace del negro por
  arriba con un fundido en curva. Siguen pendientes Laboratorio y Sesión (03 — 2 y 3).
- **Banda al pie de la 02** (`.us-work-band`; la sección lleva `us-work--banded`): las funciones de la
  01 en espejo. Nace del recuadro oscuro de la derecha, con el remate cóncavo en la esquina del lienzo
  claro, cruza hasta el borde izquierdo y enlaza con el recuadro oscuro de la 03. Sustituye al cruce
  en diagonal con degradado.
- **Dentro de la banda, el destino de cada incorporación** (cifras de prueba): Sesiones 71 %,
  Investigación 18 % y Archivo 11 %, con la media de los últimos doce ciclos.
  - Como en las funciones, cada parte lleva su trazo encima, pero aquí el trazo es una cápsula que
    mide lo que la parte (`style="--share: …"` en cada `div` del `dl`). Gris de contexto, salvo la
    del Archivo, en coral, que lleva a la 03.
  - En escritorio la franja mide lo mismo que la de las funciones de la 01: el negro sube 1,5 rem
    sobre el medidor y baja el 60 % del margen, como allí, y la cifra va al lado del nombre (solo
    baja a otra línea si no cabe, a unos 1001 px).
  - En móvil, una barra por destino que crece desde la izquierda, con el nombre y la cifra debajo.
  - Las dos líneas de la cabecera del medidor no se parten: `appFitLine` (`FitLineDirective`, nueva
    en los `imports` de `about-page.component.ts`).
- **02, «Bajo custodia»:** vuelve a medir lo mismo que «Del origen a la mesa» (la banda baja lo justo).
  La foto de la custodia llega hasta la banda con un fundido corto y la esquina de abajo a la
  izquierda redondeada, junto a la del lienzo claro.
- **03 — 1:** el rótulo «03 / El ecosistema — 1» lleva un halo oscuro solo en escritorio, donde va
  sobre la foto.
- **Los dos recorridos** (`.us-chain`, el de la 02 y el de la 03 — 2): las mismas chips, pero más
  discretas. Son translúcidas sobre el negro, con un borde fino, el texto claro en Nunito 600 y los
  números en coral. La última pierde el relleno coral macizo y lleva solo el borde y un velo en coral.
  Solo cambia el CSS.

## Posibles choques

- `about-page.component.html`, `.css` y `.ts`. Si otra rama toca Nosotros, **manda la versión de
  `clos`** y lo de la otra se reaplica encima. En el `.ts` solo cambia la lista de `imports`.
- El CSS de Nosotros queda en 42,00 kB: sigue el aviso de 20 kB, como antes, por debajo del error de
  48 kB.

## Después del merge, comprobar

1. `pnpm check` (22 pruebas).
2. `/nosotros` a 390, 1280×720, 1536×750 y 1920×1080:
   - La banda de la 02 nace del recuadro oscuro de la derecha, con las esquinas redondeadas, y enlaza
     sin hueco con el negro de la 03.
   - Las dos partes de la 02 miden lo mismo.
   - La franja del medidor mide lo mismo que la de las funciones de la 01; el medidor va en una fila
     en escritorio y en tres barras en móvil.
   - El rótulo de la 03 — 1 se lee sobre la foto del Archivo.
3. El bloque de la arquitectura se despliega con una pestaña o el botón y se repliega con el botón o
   pulsando otra vez la pestaña abierta.
