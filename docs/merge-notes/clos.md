# Notas de merge — rama `clos`

Dos tandas del 13 de octubre de 2026 (tarde), sobre `main` en `ce8592f`: `fef2199` y el commit que
sigue. Las notas anteriores de esta rama ya están integradas (la última, en la integración del 13 de
octubre); quedan en el historial de git.

## 1. El cierre de la arquitectura ejecutiva, retocado (`fef2199`)

La arquitectura ejecutiva ahora está en la 05 de Nosotros (antes, la 04; ver el punto 3). Los textos
siguen literales.

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

## 2. Las pestañas de la arquitectura, con transición

- Al cambiar de capa, el texto de la capa y la célula entran con un fundido y suben un poco
  (`us-arch-in`, 0,45 s), el gesto de las distinciones de la portada. Así se nota el cambio aunque
  se pase rápido de una pestaña a otra. También al desplegar el bloque. Con movimiento reducido, solo
  el fundido.
- El texto entra solo porque las capas ocultas no tienen caja. La célula se vuelve a pintar en cada
  cambio (`@for (layer of [activeTab()]; track layer)`), como la medalla de la portada; por eso ya no
  lleva transiciones de color.

## 3. Secciones renumeradas

- **Rótulos:**
  - «03 / El Archivo» (antes «03 / El ecosistema — 1»).
  - «04 / El ecosistema — 1» y «— 2», en «Conservar lo imposible» y «Del Archivo a la experiencia»
    (antes «03 / El Archivo» y «03 / El ecosistema — 3»).
  - «05 / Nuestra organización» (antes 04).
- **Anclas:** `#archivo` lleva al Archivo y `#ecosistema` pasa a la sección de «Conservar lo
  imposible».
- **El índice de la cabecera** tiene cinco entradas. Los títulos no se parten (`white-space: nowrap`):
  van en una fila desde 1251 px, en dos filas (de tres y dos) de 901 a 1250 y apilados hasta 900
  (antes, hasta 600). Con cinco en fila se salían entre 650 y 720 px y se partían entre 800 y 1250.
- **En móvil** vuelven a verse «02 / Nuestro trabajo — 1» y «04 / El ecosistema — 1», y los iconos de
  los rótulos: la regla que ocultaba «Una definición funcional» (`.us-label span:last-child`) los
  ocultaba también. Ahora es `.us-label > span:not(:first-child)`.
- Los comentarios del HTML y del CSS que citaban números de sección siguen la numeración nueva.

## 4. El CTA final (la invitación a Collaborators)

- Arriba y abajo, el aire que deja antes del pie el cierre de Inicio y de Sesiones:
  `clamp(7.5rem, 15.5vw, 14.5rem)`, 232 px a 1536 (antes, 72 y 80).
- Desde 1520 px, la puerta se ensancha por el centro 3rem a cada lado (`--door-extra`), con más aire
  para su título y las minimilks; la puerta y el texto van cada uno a su ancho y juntos en el centro
  de la tarjeta. A 1536, la puerta pasa de 514 a 571 px y el aire a los lados queda en 86 y 86 (antes,
  87 a la izquierda y 126 a la derecha). Por debajo de 1520 no cambia.
- El título, partido a mano como en los cierres de Inicio y Sesiones: «Hay un sitio <br />para
  usted.». Antes, a 1920 se partía «Hay un sitio para / usted.».
- Para ensanchar la puerta sin romper la perspectiva:
  - `collaborators-door.component.css` abre lo mismo el marco, el portal y el panel.
  - `sample-reception.component.css` toma el ancho del portal de `--sample-portal-width` (40rem por
    defecto) y calcula con él cuánto se abren el techo y el suelo. Con el valor por defecto, todo mide
    lo mismo que antes.

## Posibles choques

- `about-page.component.html` y `.css`. Si otra rama toca Nosotros, **manda la versión de `clos`** y
  lo de la otra se reaplica encima. Ojo con los enlaces a `/nosotros#ecosistema`: ahora llevan a la
  04, no al Archivo (en esta rama no hay ninguno fuera de Nosotros).
- `features/collaboration/sample-reception.component.css` y `collaborators-door.component.css`: si
  otra rama los toca, conservar `--sample-portal-width` y `--door-extra`. Si otra rama vuelve a pintar
  `app-sample-reception` en la portada, se ve igual que antes (valores por defecto).
- El CSS de Nosotros queda en unos 45,6 kB, por debajo del error de 48 kB (sigue el aviso de 20 kB).

## Pendiente de decidir

- Entre unos 1001 y 1100 px:
  - El recuadro de la frase de la arquitectura es muy estrecho: la frase va en seis líneas, con
    cuatro palabras partidas. Se arreglaría haciendo el margen lateral proporcional al ancho del
    recuadro (a 1536 no cambiaría).
  - En el CTA final, la puerta se sale un poco de su columna y el párrafo y el lema se parten en dos
    líneas (ya pasaba antes). Se arreglaría con una puerta más pequeña en ese tramo o quitándola,
    como en móvil.

## Después del merge, comprobar

1. `pnpm check` (33 pruebas).
2. `/nosotros` a 390, 1024×768, 1280×720, 1536×750 y 1920×1080:
   - Con la arquitectura abierta, en las cuatro pestañas: en escritorio, la etiqueta de la derecha
     sobre la línea base del título del cierre y el recuadro de la frase justo debajo de la lista
     (36 px a 1536, 32 a 1280); la frase, justificada sin huecos y sin negrita; los subtítulos de IEA
     y SEA, en una línea.
   - Al cambiar de pestaña, el texto y la célula entran con el fundido.
   - Los rótulos, de 01 a 05, también en móvil, y el índice: una fila desde 1280, dos filas a 1024,
     apilado en móvil; cada enlace lleva a su sección.
   - El CTA final: 232 px arriba y abajo a 1536; desde 1520, la puerta ancha y centrada con el texto,
     y el techo y el suelo acabando en las rayas de fuera.
