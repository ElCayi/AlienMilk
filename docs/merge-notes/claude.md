# Notas de merge — rama `claude`

Tanda del 8 y el 9 de octubre de 2026, sobre `main` en `029584c`: commit `65f7ea7`.
Comprobado el 9 de octubre tras actualizar `origin`: `pnpm check` en verde (lint, 22 pruebas y build) y
`git merge-tree --write-tree` sin conflictos contra `clos` (`5db79e9`) y `MegaClos` (`550a7a1`).

## Qué trae

### Portada

- **Próximas sesiones:** el párrafo del recuadro editorial, del ancho del de las demás secciones. La
  hoja blanca acaba con algo más de aire bajo las tarjetas (`--sessions-end-air`, en
  `home-session-dossier.css`), y Localizaciones baja lo mismo para que su tinta conserve el aire de
  arriba.
- **Collaborators:**
  - Las dos columnas bajo la foto llevan titular, con el remate en coral: «Conozca y participe en la
    comunidad.» y «Viajes, estancias y experiencias. Gratis.». Debajo, el texto nuevo de Cayi, al
    cuerpo de los recuadros editoriales, con la firma AlienMilk Collaborators en las dos columnas.
  - Los pasos de «Cómo colaborar», más cerca de su entradilla.
- **En buenas manos (`features/trust/`):**
  - **Distinciones:** cada franja del palmarés es un botón que pasa su distinción a la destacada
    (nombre, organismo, fecha y leyenda de la medalla) con un fundido; el nudo de la activa, en coral.
    La ventana del palmarés ya no arrastra la página al llegar arriba o abajo. El (+) «Síntesis»
    despliega bajo la destacada el resumen de cada distinción. El rótulo y «Todas vigentes» se
    alinean con la destacada, y los nombres largos bajan un cuerpo para quedarse en dos líneas.
  - Distinciones renombradas o con otro organismo: CATL (antes CEE), CMR, SWX, OF (antes VANTA) y GV
    (antes CEA).
  - **Franja de tinta:** la cinta de socios es un rectángulo redondeado, medio traslúcido sobre el
    fondo líquido, con menos hueco entre marcas y una barra sobre sus rótulos. Las cifras van en
    recuadros hundidos del ancho de la cinta. La tinta se pinta ahora en dos bloques
    (`.trust-reel-ink`), encima y debajo de la cinta.
  - **Experiencias:** un carrusel de 18 citas por páginas (tres en escritorio, una por debajo de
    1000 px). Pasa solo cada 7 s: la raya entre los números de página se llena y, al llenarse, pasa.
    Se para con el cursor o el foco del teclado encima, al arrastrar y fuera de la vista; con
    «reducir movimiento», no pasa solo. Tiene flechas, se arrastra con el ratón y se desliza con el
    dedo o el touchpad, y da la vuelta en los dos extremos. Las citas están en
    `trust-network.component.ts` (`VOICES`).
  - **Discreción:** una barra con el mismo aire arriba y abajo la separa de las experiencias, y su
    cabecera tiene el ritmo de «Cómo colaborar».
  - Los estilos de la segunda hoja (experiencias y discreción) pasan a `trust-privacy.css`, hoja
    nueva, para no pasar el límite de 20 kB por hoja.

### Backend

- `premio` gana `descripcion` (`VARCHAR(600)`), el texto de «Síntesis», y `/api/red-de-confianza` la
  sirve. Si el backend no la trae, el frontend usa la de reserva, por sigla.
- `migraciones/2026-10-07-red-confianza.sql` se sigue pudiendo aplicar varias veces. Los cambios de
  nombre y sigla van antes del `INSERT IGNORE`: con `nombre` único, después duplicarían filas. La
  columna se añade con `ADD COLUMN IF NOT EXISTS` y se rellena con `UPDATE`. `script_bbdd.sql`
  lleva lo mismo.

## Posibles choques

`git merge-tree --write-tree` no da conflictos con `clos` ni con `MegaClos`. `MegaClos` toca dos de
los mismos archivos, pero solo añade: en `script_bbdd.sql`, las tablas de la tienda (`productos`,
`pedidos` y `lineas_pedido`), y en `api.models.ts`, sus tipos. Se fusionan solos.

## Después del merge, comprobar

1. `pnpm check`. El paquete inicial está en unos 588 kB: sigue el aviso de 500 kB, lejos del error de
   1 MB.
2. **Migración:** volver a aplicarla en cada base que ya tenga la del 7 de octubre y reiniciar el
   backend:
   `mariadb reserva_eventos_bbdd < reto-eventos-backend/migraciones/2026-10-07-red-confianza.sql`.
   Deben quedar 9 premios, todos con `descripcion`. La base de desarrollo local ya está al día.
3. **`/`** a 390, 1280×720, 1536×750 y 1920×1080:
   - Palmarés: al pulsar una franja cambia la destacada, y el (+) abre y cierra la síntesis.
   - La cinta medio traslúcida, sin rayas claras en las juntas con la tinta.
   - Carrusel: pasa solo, se para con el cursor encima, y las flechas, el arrastre y el touchpad dan
     la vuelta en los extremos.
   - Collaborators: los dos titulares del mismo tamaño y en una sola línea.
