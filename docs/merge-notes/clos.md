# Notas de merge — rama `clos`

Un retoque del 14 de octubre de 2026, sobre `main` en `ff02f00`. Las notas anteriores de esta rama
(`fef2199` y `a4cea78`) ya están integradas; quedan en el historial de git.

## El título de la puerta del CTA final de Nosotros, un 10 % más grande

- `features/collaboration/sample-reception.component.css`: el tamaño del título de la puerta en
  escritorio (4.1rem) se multiplica por `--door-title-scale`, 1 por defecto. Quien no la pida ve el
  título igual que antes.
- `pages/about/about-page.component.css`: la puerta del CTA final pide `--door-title-scale: 1.1` en
  todos los anchos en los que se ve (desde 1001 px). Las minimilks y el ancho de la puerta no cambian.
- El título se parte igual que antes: «¿Quieres / formar parte / de AlienMilk?» a 1280 y a 1536×750;
  en dos líneas a 1920.

## Posibles choques

- Si otra rama toca la regla `@media (min-width: 1001px)` del final de `sample-reception.component.css`
  (el título, las minimilks y el lema de la puerta), conservar el `calc(4.1rem * var(--door-title-scale, 1))`.
- En ese archivo sigue el aviso de Prettier de antes (la altura del techo del portal); no es de este
  cambio.

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
2. `/nosotros`, el CTA final a 1280×720, 1536×750 y 1920×1080: el título de la puerta algo más grande
   y partido como antes; las minimilks y la puerta, como estaban.
