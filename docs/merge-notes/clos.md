# Notas de merge — rama `clos`

Tanda del 6 de octubre de 2026, sobre `main` en `acc077c`. Las notas anteriores de esta rama ya están
integradas (la última, `3dc0b59`, en la integración del 5 de octubre); quedan en el historial de git.

## Qué trae: Nosotros completa

Sigue la estructura que propuso JT en su análisis de la página: 01 Nuestro campo, 02 Nuestro trabajo,
03 El ecosistema, 04 Nuestra organización y, como cierre, la nota del equipo.

- **Cabecera:** nota nueva de la usuaria («la primera firma galactoláctica de toda Laniakea…»). El
  índice baja también a la 04.
- **Orden nuevo:** 01 → 02 → 03 → Trayectoria → 04 → nota del equipo → invitación. La nota firmada
  («…averiguar qué más queda por probar») pasa de abrir el equipo a cerrar la página.
- **03 / El ecosistema (nueva):** sustituye a la de las dos tarjetas de Sessions y Collaborators.
  - Unida a la 02, sin hueco, con las columnas de la 01: el recuadro oscuro llega a la misma vertical
    que la placa de la 01 y el recuadro de la 02. En el cruce con la 02 se redondean las tres
    esquinas y el negro pasa en diagonal.
  - Parte 1, «Un archivo que también se prueba.»: texto de la usuaria sobre el Archivo y, sobre la
    foto, el expediente de la muestra AM-2291-F de la cabecera.
  - Los destinos de una muestra, en cápsulas como el recorrido de la 02.
  - Parte 2, «El archivo crece cuando se comparte.»: investigación y degustación, una frase de cierre
    en coral y, sobre la foto, una tarjeta con los programas (Sessions → `/sesiones`, Collaborators →
    `/contacto`).
  - Los principios de trabajo de JT, literales, en una banda negra al pie.
- **Dos fotos pendientes:** en la 03 hay dos huecos marcados «Imagen pendiente» (Archivo y Sesión),
  `span.us-eco-pending`. Para poner cada foto basta con cambiar el `span` por un `img`: el CSS ya
  trata los dos igual.
- **Trayectoria:** párrafo nuevo bajo el titular, sobre la red y la relación con el origen.
- **04 / Nuestra organización:** rótulo nuevo sobre el retrato; el retrato y la arquitectura, sin
  cambios.
- **02:** la foto de la custodia acaba con las dos esquinas de abajo redondeadas; antes se metía en la
  esquina del lienzo claro.

### Segunda tanda (7 de octubre, tras `6c0f2b9`)

- **03 partida en dos secciones:**
  - **03 — 1, el Archivo:** con la geometría de la 01, que mide una pantalla y tiene el recuadro claro igual. Lleva el rótulo «Una biblioteca reproducible», una entrada justificada y un párrafo que escala con `appFitBox`. Sobre la foto pendiente, el sello «Archive original · Not for service» y la ficha del lote de reproducción R17. Al pie, una banda con los estados M-01 a M-04, como las funciones.
  - **03 — 2 y 3:** con la geometría de la 02 y sus dos recuadros claros del mismo alto que los de la 02. La 03 — 2, «Ninguna copia es idéntica.», trata de la caracterización y el índice de fidelidad; en medio va el camino de una muestra, en cápsulas; la 03 — 3, «De la mesa a la colección.», lleva la alícuota de origen y la tarjeta de programas. Hay tres fotos pendientes (Archivo, Laboratorio y Sesión).
- **Principios de trabajo y Trayectoria (cifras y cinta de marcas) retirados** de Nosotros; la Trayectoria pasa a la portada en la rama `claude`. `BRANDS` sale del `.ts`.
- **Nota de Cayi:** vuelve entre la 03 y la 04, encima del retrato.
- **02:** la foto de la custodia se funde con el negro también por abajo.

## Posibles choques

- `about-page.component.html` y `.css` cambian mucho. Si otra rama toca Nosotros, **manda la versión de
  `clos`** y lo de la otra se reaplica encima.
- **Rama `claude`:** su último commit lleva la puerta de Collaborators a Nosotros y toca `about-page.component.ts`. Chocará con esta rama: se conserva la estructura de `clos` y se reaplica encima la puerta.
- El CSS de Nosotros queda en 38,5 kB: sigue el aviso de 20 kB, como antes, lejos del error de
  48 kB.

## Después del merge, comprobar

1. `pnpm check` (22 pruebas).
2. `/nosotros` a 390, 1280×720, 1536×750 y 1920×1080: el índice baja a las cuatro secciones; la 02 y
   la 03 van unidas, sin hueco, con el cruce redondeado; la 01, la 02 y la 03 comparten la vertical
   entre claro y oscuro.
3. El bloque de la arquitectura se despliega con una pestaña o el botón y se repliega con el botón o
   pulsando otra vez la pestaña abierta.
4. Los enlaces de la tarjeta de programas llevan a `/sesiones` y `/contacto`.
