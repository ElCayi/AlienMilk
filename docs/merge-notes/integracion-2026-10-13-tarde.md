# Entrega de la integración — 13 de octubre de 2026, tarde

## Incorporado

- `clos` (`fef2199`, `a4cea78`): cierre de la arquitectura ejecutiva alineado con su título,
  fundido al cambiar de pestaña, Nosotros renumerada en cinco secciones (03 El Archivo, 04 El
  ecosistema, 05 Nuestra organización) con su índice, y la puerta final más ancha desde 1520 px.
- `claude` (`d748693`, `6b7a395`, `6c4a686`): final de la portada en móvil, la regla de medir
  (`?regla`, solo en desarrollo), `shared/fit-controls/` (los botones no parten su rótulo),
  maqueta de tableta de 901 a 1000 px y el menú hamburguesa por encima de la página.
- `MegaClos` (`7ca2ad5`, `a962bcb`, `1f9acc8`): `up.sh` carga `.env.local` para el backend,
  moléculas compartidas (`app-molecule`) y tarjetas en hoja en la tienda, la fiesta de minimilks en
  los pedidos confirmados y desplegables de secciones para cada página de la cabecera.
- `mini-codex` (`e63e143`, `11a521c`): `/admin/<sección>` y Mi panel (`/cuenta`) rehechos con el
  aspecto de la web y su propio marco de aplicación. En el backend: reglas de coherencia (sesiones
  con reservas se cancelan, cuentas en uso dan 409, validación por campo…) y los resúmenes del
  panel. `/reservas` redirige a `/cuenta/reservas`.
- `mini-codex2`: sin cambios.

## Decisiones de merge

Orden `clos` → `claude` → `MegaClos` → `mini-codex`, con `--no-ff`. `git merge-tree` no dio
conflictos en ninguna pareja. `claude`, `MegaClos` y `mini-codex` coinciden en `app.css`,
`app.html` y `app.ts` (menú encima de la página, desplegables y marco de los paneles), y
`MegaClos` y `mini-codex` coinciden en la tienda. Todo se fusionó solo y convive bien en el
navegador.

- **Arreglo propio (`1904cfc`):** el desplegable de Nosotros de `MegaClos` es anterior a la
  renumeración de `clos` y solo tenía cuatro secciones. Se añade «El Archivo» (`#archivo`) entre
  Nuestro trabajo y El ecosistema, con los rótulos del índice de la página.
- **Letra al 150 % en tableta:** `claude` la pone en `styles.css` para toda la web entre 901 y
  1000 px. Se probó limitarla a la portada, pero Cayi decidió mantenerla en todas las páginas. Ver
  pendientes.

Las cuatro `alienmilk-closing-*.webp` siguen sin versionar en el worktree de `claude`. El vídeo de
Getty sigue fuera de Git.

## Comprobaciones

- `pnpm check`: lint, 33 pruebas en 8 archivos y build de producción correctos.
- `./mvnw -q test`: 78 pruebas correctas, incluidas las nuevas de administración (catálogos,
  sesiones y usuarios).
- Backend compartido reiniciado. Ahora lee `.env.local`, así que tiene las claves de prueba de
  Stripe: `pagoConTarjeta: true`. Las rutas de admin y `usuarios/me` sin sesión dan 401.
- Navegador, `/`, `/nosotros`, `/tienda`, `/contacto` y `/sesiones` a 360×740, 390×844, 912×1368,
  1280×720, 1536×750 y 1920×1080: no hay desbordamiento horizontal en ninguna, ni errores de consola
  (salvo el aviso de `ResizeObserver`).
- `/admin` con la cuenta de demostración `admin`: las ocho secciones cargan sin errores, sin la
  barra ni el pie de la web. Revisado a ojo Pedidos a 1536.
- `/cuenta` con `ana`: el login lleva a `/cuenta/reservas`, y Reservas, Pedidos y Datos cargan bien.
  Revisado a ojo a 390. Sin sesión, `/reservas` pasa por el login hacia `/cuenta/reservas`.
- Cabecera: en escritorio, el desplegable de Nosotros se abre al pasar el ratón y «El Archivo» baja
  a su sección. En móvil, el menú se abre por encima sin mover la página y el acordeón despliega las
  secciones.
- No se pulsó ninguna acción de escritura en los paneles (marcar envíos, anular, borrar).

## Migraciones

Ninguna nueva en esta tanda. Siguen pendientes en producción las de las entregas del 9 y el 13 de
octubre.

## Pendientes e incoherencias observadas

1. **Tableta (901–1000 px), fuera de la portada:** con la letra al 150 %, las páginas que en ese
   tramo siguen en su maqueta de escritorio se quedan apretadas. A 912:
   - en la Tienda, las fichas de condiciones se montan unas sobre otras y se salen del recuadro;
   - en Contacto, «Concertar una visita» se parte en dos líneas y la flecha se sale del filete;
   - en Nosotros, el índice de la cabecera queda descompensado.

   No hay desbordamiento de página. Cayi lo está revisando.
2. **Paquete inicial:** 741,54 kB (antes 719,44 kB). Hace falta un 1 MB para el error.
3. **Tamaños de CSS:** Ubicaciones 47,13 kB (a 0,87 kB del error de 48 kB), Portada 45,77 kB,
   Nosotros 45,55 kB, Contacto 24,11 kB y la red de confianza 22,13 kB.
4. **Stripe en el backend compartido:** ahora cobra de verdad en el entorno de prueba de Stripe. Los
   pedidos de prueba se quedan en `PENDIENTE_PAGO` hasta pagar o caducar (30 min).
5. **`clos`, por decidir:** entre unos 1001 y 1100 px, el recuadro de la frase de la arquitectura es
   muy estrecho, y la puerta del CTA final se sale un poco de su columna.
6. **`mini-codex` no dejó nota de merge.** Lo recogido aquí sale de sus commits y del diff.
7. Siguen abiertos los pendientes de las entregas anteriores que no toca esta tanda.
