# Notas de merge — rama `clos`

Tanda del 2 de octubre de 2026, sobre `main` en `5da7bcf`. Las notas anteriores de esta rama ya están
integradas (la última, `552033d`, en la integración del 1 de octubre); quedan en el historial de git.
Esta tanda parte de la versión de Nosotros de `mini-codex` que ya está en `main` (`2d37300`).

## Qué trae: página Nosotros

- **Escritorio:** cada sección llena el alto útil de la pantalla (la pantalla menos la barra
  superior) y lo de dentro se adapta; la 02 mide lo que su contenido. En móvil las secciones fluyen.
- **Cabecera:** «Descubrir sesiones» más grande; el aire bajo la eyebrow, igualado al de Sesiones.
- **01 / Nuestro campo:**
  - Imagen nueva, el busto con el equipo acoplado (`public/alienmilk-about-android.webp`), en lugar
    de las manos. `alienmilk-about-hands.webp` sigue en el repositorio, sin uso en Nosotros.
  - Titular «El fin antes que la forma.» en **Gloock**, una palabra por línea, detrás del busto;
    «forma.» pasa por delante gracias a una copia del titular con `aria-hidden`.
  - Placa negra hasta arriba, sin la raya del rótulo y con minimilk; el texto de la derecha escala
    (`appFitBox`) para medir lo mismo que el titular; las funciones, algo más abajo.
- **02 / Nuestro trabajo:** sustituye a la banda «Del origen a la mesa» con sus tres pasos.
  - Textos de la usuaria, literales, con subtítulos en coral y frases clave en negrita.
  - «Recorrido de una muestra»: ocho cápsulas que cruzan la sección del lienzo claro al recuadro
    oscuro.
  - La sección va en dos partes del mismo alto, «02 / Nuestro trabajo — 1» y «— 2».
  - El recuadro oscuro queda reservado para una imagen pendiente.
- **Unión 01/02:** esquinas pequeñas en el lado izquierdo.

### Segunda tanda (mismo día, `065a52f` → siguiente commit)

- **01:** el busto deja la placa a un paisaje (`public/alienmilk-about-station.webp`) que la llena,
  con el titular encima y una etiqueta pequeña de la sede (Estación Meridiana, Gliese 667 Cc). El
  texto de la derecha pasa a la tipografía de la 02. En escritorio la placa también pasa por detrás
  de las funciones.
- **02:** el recorrido va en su propio recuadro oscuro, unido al de la derecha. El recuadro lleva
  dos fotos: el androide granjero arriba (`alienmilk-about-farmer.webp`) y el androide de la
  custodia abajo (`alienmilk-about-custody.webp`). La 02 acaba con esquinas propias.
- **Equipo (nuevo, entre la 02 y la 03):** frase centrada sobre la textura y el retrato del equipo
  (`alienmilk-about-team.webp`) en un marco blanco al ancho de los lienzos, con una minimilk coral
  en la taza. La 03 empieza como lienzo aparte.
- **Invitación final:** la tarjeta oscura lleva a la izquierda la portada de la 01 con el busto
  (`alienmilk-about-android.webp`).
- Esquinas de la unión 01/02 más pronunciadas (`--seam`).

## Posibles choques

- `about-page.component.*` cambia mucho, sobre todo el CSS. Si otra rama toca Nosotros, **manda la
  versión de `clos`** y lo de la otra se reaplica encima.
- `src/index.html` añade la familia **Gloock** a la carga de Google Fonts.

## Después del merge, comprobar

1. `pnpm check` (22 pruebas).
2. `/nosotros` a 390, 1280×720, 1536×750 y 1920×1080: cada sección cabe en la pantalla, la 02 mide lo
   que su contenido y la cadena cruza del blanco al negro.
3. Que se ven las imágenes de Nosotros en `public/` (estación, granjero, custodia, equipo y el busto en
   la invitación).
