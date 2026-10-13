# Notas de merge — rama `clos`

Tanda del 13 de octubre de 2026 (tarde), sobre `main` en `ce8592f`. Las notas anteriores de esta
rama ya están integradas (la última, en la integración del 13 de octubre); quedan en el historial de
git.

## Qué trae: el cierre de la arquitectura ejecutiva, retocado (04 de Nosotros)

Los textos siguen literales.

- **La frase final** («A escala interplanetaria…»): el recuadro toma la forma de la credencial de
  Cayi, con las esquinas grandes en una diagonal y pequeñas en la otra (`var(--seam) 0.35rem`). Gana
  margen lateral (`1.9rem`) y pierde la negrita: el texto va al peso de los párrafos (500) y el
  remate, «diseñar para ella», se distingue solo por el coral. Va justificado, como los párrafos. En
  el recuadro caben unas 25 letras por línea, así que el sobrante se reparte también entre las letras
  (`text-justify: inter-character`); repartido solo entre palabras, abría huecos a varios anchos. En
  los navegadores sin `text-justify` se justifica de la forma normal, con algún hueco.
- **La responsabilidad de cada capa** (y el principio de la 04): filas más sueltas, de unos 47 a
  57 px a 1536.
- **Los subtítulos de IEA y SEA** («Inteligencias Ejecutivas Autónomas», «Synthetic Executive
  Agents»): pasan del cuerpo del texto a 1,45 veces, un escalón entre el título y la entradilla. Van
  en una línea con `appFitLine` (`[appFitLineMin]="16"`); en móvil, el de IEA se encoge a unos 18 px.
- **El cierre, en escritorio:**
  - El título «Diseñadas para operar a otra escala» va solo en la columna ancha. La estrecha empieza
    a su altura, con la etiqueta («Responsabilidad» o «Principio») sobre su línea base. El margen de
    `.us-arch-facts` sale del cuerpo del título (0,755 de él, ya encogido por el `scaleY`): si cambia
    el cuerpo del título, hay que cambiarlo también ahí.
  - La frase final va justo debajo de la responsabilidad, ya no al pie. La rejilla gana una sexta
    fila, flexible (`grid-template-rows: repeat(5, auto) 1fr`), que se queda con lo que sobra del
    texto del cierre; así el texto no separa la frase de la lista.
  - En móvil no cambia nada de esto.

## Posibles choques

- `about-page.component.html` y `.css`. Si otra rama toca Nosotros, **manda la versión de `clos`** y
  lo de la otra se reaplica encima.
- El CSS de Nosotros queda en unos 45,0 kB, por debajo del error de 48 kB (sigue el aviso de 20 kB).

## Pendiente de decidir

- Entre unos 1001 y 1100 px, el recuadro de la frase es muy estrecho: la frase va en seis líneas,
  con cuatro palabras partidas. Se arreglaría haciendo el margen lateral proporcional al ancho del
  recuadro (a 1536 no cambiaría).

## Después del merge, comprobar

1. `pnpm check` (33 pruebas).
2. `/nosotros`, con la arquitectura ejecutiva abierta, a 390, 1280×720, 1536×750 y 1920×1080, en
   las cuatro pestañas:
   - En escritorio, la etiqueta de la derecha, sobre la línea base del título del cierre, y el
     recuadro de la frase justo debajo de la lista (36 px a 1536, 32 a 1280).
   - La frase, justificada sin huecos y sin negrita, en su recuadro con las esquinas de la
     credencial.
   - Los subtítulos de IEA y SEA, en una línea.
