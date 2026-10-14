# Notas de merge — rama `claude`

Tanda del 6 y el 7 de octubre de 2026, sobre `main` en `acc077c`: commits `d91a4be` y `04a584d`.
Comprobado el 7 de octubre tras actualizar `origin`: `pnpm check` en verde (lint, 22 pruebas y build) y
`git merge-tree --write-tree` contra las demás ramas (ver «Posibles choques»).

## Qué trae

### Portada

- **«En buenas manos»**, sección nueva entre Collaborators y el CTA final (`features/trust/`):
  - Cabecera como las demás secciones: barra, rótulo, título, subtítulo en coral y entradilla.
  - Una franja de tinta entre dos hojas blancas. Arriba, la Distinción de Custodia Continuada con su
    medalla (cara coral, minimilk calada, leyenda «CCSL.1962» girando por dentro) y, debajo, el
    palmarés en una ventana con scroll del mismo ancho que la medalla y su texto, en franjas alternas
    del mismo alto. En medio, la cinta de socios de borde a borde. Al final, las cifras, con el cero
    en coral.
  - Segunda hoja: experiencias sin firma y la discreción (Protocolo AM-0).
  - Distinciones, socios y cifras llegan del backend (`TrustNetworkService`). Si no responde, se
    muestran los mismos datos, guardados en el servicio y en `brands.ts`.
- **Fondo (`liquid-backdrop`):** pinta de blanco las dos hojas de la sección (`data-backdrop-block` y
  `data-backdrop-block-sheet`, uniformes `uBlock` y `uBlock2`), con las esquinas de los marcos.
- **Collaborators:**
  - «Cómo colaborar»: el blanco acaba en curva sobre la tinta y hay minimilks flotantes.
  - Los pasos llevan el texto de JT e imágenes nuevas; las tarjetas crecen al pasar el ratón y la
    píldora dice «Cuéntenos su propuesta».
  - La foto del equipo, retocada, con el pie «Estación Pelagia, AE03 - Lagos».
  - Corregido el hueco bajo la foto: el margen superior de la sección estiraba su fila.
- **CTA final:** el astronauta brindando bajo la Vía Láctea, colocado desde la portada con variables
  nuevas de `closing-cta` (posición, tamaño y fundidos). Sesiones se queda con los valores por
  defecto. La distancia al pie es la misma que en Sesiones.
- La puerta de Collaborators sale de la portada (ver Nosotros).

### Nosotros

- **La invitación final es ahora la puerta de Collaborators.** Es una tarjeta blanca con la puerta
  (`CollaboratorsDoorComponent`, nuevo en `features/collaboration/`) a la izquierda. A la derecha van
  «Programa de colaboradores», «Hay un sitio para usted.», «Sin compromiso, sin prisas y sin
  complicaciones.», «El dolor es temporal. La gloria es eterna.» y la píldora «Acceder a AlienMilk
  Collaborators».
- **Cayi quiere conservarla sí o sí.** Se retocará, pero la línea está decidida: no se sustituye por
  la tarjeta oscura anterior (el androide y «Ver próximas sesiones»).
- `SampleReceptionComponent` gana `panelOnly` y `hideActions`, para que la puerta muestre solo el
  panel.

### Backend

- Tablas `socio`, `cifra_confianza` y `premio`, en `migraciones/2026-10-07-red-confianza.sql`, que se
  puede aplicar varias veces, y en `script_bbdd.sql`.
- `GET /api/red-de-confianza`, público (añadido en `SecurityConfig`). Devuelve las distinciones, los
  socios activos y las cifras, en orden.
- «Continuidad» guarda el año de fundación (1809) y se sirve calculada: hoy, 217 años.

## Posibles choques

`git merge-tree --write-tree` solo da conflictos en Nosotros. El resto se fusiona solo, incluido
`locations-atlas.component.html`, que también toca `MegaClos`.

| Rama | Archivos | Qué coincide | Resolución |
| --- | --- | --- | --- |
| `clos` | `about-page.component.ts`, `.html` y `.css` | `clos` reorganiza Nosotros y retira la Trayectoria (cifras y cinta de marcas). `claude` cambia la invitación por la puerta y, en `04a584d`, hace que esa cinta lea los socios del backend. | Manda la estructura de `clos`. De `claude` solo se reaplica la invitación: el bloque `<section class="us-invitation">`, las reglas `.us-invitation*` de `git diff acc077c d91a4be -- reto-eventos-frontend/src/app/pages/about/about-page.component.css` y `CollaboratorsDoorComponent` en los `imports` del `.ts`. Lo de la cinta se descarta: en Nosotros no deben quedar `TrustNetworkService` ni `ngOnInit`. |
| `MegaClos` | `about-page.component.html` | `MegaClos` pone en negrita «probar», «preguntar» y «descubrir» en el texto antiguo de la invitación. | Conservar el texto de `claude`, el de Collaborators. Ojo: `MegaClos` añade `:is(.us-arch-head, .us-unit, .us-invitation-card) b { color: var(--light); }`, y sobre la tarjeta blanca una negrita saldría casi invisible. Si se añaden negritas a la invitación, hay que quitar `.us-invitation-card` de esa regla. |

## Después del merge, comprobar

1. `pnpm check`. El paquete inicial pasa a unos 554 kB: sigue el aviso de 500 kB, lejos del error de
   1 MB.
2. **Migración:** aplicarla en cada base de datos que no la tenga:
   `mariadb reserva_eventos_bbdd < reto-eventos-backend/migraciones/2026-10-07-red-confianza.sql`.
   La base de desarrollo local ya la tiene. Después, reiniciar el backend para que exista el
   endpoint; mientras tanto, la portada muestra los datos de reserva.
3. **`/`** a 390, 1280×720, 1536×750 y 1920×1080:
   - Las dos hojas blancas de «En buenas manos» pegadas a la franja de tinta, sin costuras, y el
     blanco rellenando sus dos curvas.
   - El palmarés del ancho de la medalla y su texto, con todas las franjas del mismo alto.
   - La cinta sin pausa al pasar el ratón.
   - En Collaborators, el mismo aire entre la foto y el texto que entre la entradilla y la foto (unos
     48 px a 1536), sin hueco de más.
4. **`/nosotros`:** la tarjeta de la puerta a 1280, 1536 y 1920.
   - La escala de la puerta (`zoom`: 0,5 hasta 1400 px, 0,6 en medio y 0,72 desde 1700 px) se ajustó
     para la Nosotros anterior; con la estructura de `clos` puede necesitar retoque.
   - Por debajo de 1000 px la puerta se oculta y queda la tarjeta con el texto.
5. **`/sesiones`:** el CTA final, sin cambios.
