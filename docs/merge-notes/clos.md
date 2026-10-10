# Notas de merge — rama `clos`

Tanda del 10 de octubre de 2026, sobre `main` en `e3eedad`. Las notas anteriores de esta rama ya
están integradas (la última, en la integración del 9 de octubre); quedan en el historial de git.

## Qué trae: la 03 de Nosotros

- **03 — 1:** la esquina de arriba a la derecha de la foto del Archivo se redondea en paralelo a la
  del recuadro claro de al lado (un remate oscuro cóncavo, `.us-eco-visual--top::after`; solo
  escritorio).
- **La parte de en medio de la 03 (antes «03 / El ecosistema — 2»)**, con el texto nuevo de la
  usuaria, literal:
  - Rótulo «03 / El Archivo», título «Conservar lo imposible.» y subtítulo «Distinción de Custodia
    Continuada.».
  - Dos párrafos: el primero abre con «AlienMilk ha sido galardonada…» en negrita; el segundo, sobre
    las tecnologías de conservación del Archivo.
  - Sigue con su hueco de foto pendiente (Laboratorio) y su ficha.
- **Recuadros claros de la 03 de alto fijo** (escritorio): las dos partes miden siempre lo que las de
  la 02 (`grid-template-rows: 21.3em auto 21.3em`). Si el texto no cabe, se desplaza dentro del
  recuadro, con una barra fina y un fundido abajo que se va al llegar al final (`--us-more-fade`, con
  `animation-timeline: scroll(self)`). Hoy solo desborda «El Archivo».
- **03 — 3, «De la mesa a la colección»:** la foto del sistema quirúrgico con la bioesfera
  (`public/alienmilk-about-laboratory.webp`, 1145×1374, 167 kB, recortada con transparencia) va
  entera y centrada sobre el negro, sin fundidos (`.us-lab-visual`). Se quitan el hueco «Imagen
  pendiente · Sesión», la ficha de la alícuota y la tarjeta de «Programas» (con sus enlaces a
  Sesiones y Contacto) y sus estilos (`.us-eco-units`…).

## Posibles choques

- `about-page.component.html` y `.css`. Si otra rama toca Nosotros, **manda la versión de `clos`** y
  lo de la otra se reaplica encima.
- El CSS de Nosotros baja a 41,5 kB: sigue el aviso de 20 kB, por debajo del error de 48 kB.

## Después del merge, comprobar

1. `pnpm check` (29 pruebas).
2. `/nosotros` a 390, 1280×720, 1536×750 y 1920×1080:
   - La esquina de arriba a la derecha de la foto del Archivo, redondeada junto a la del recuadro
     claro.
   - «El Archivo» mide lo mismo que las partes de la 02; su texto se desplaza dentro, con el fundido
     abajo, y el fundido desaparece al final.
   - El robot de la 03 — 3, entero, con la base por encima de la esquina grande; en móvil, entero y
     con su proporción.
