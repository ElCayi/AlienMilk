# Entrega de la integración — 7 de octubre de 2026

## Incorporado

- `clos` (`b1579ad`): nuevo orden de Nosotros, Archivo, reproducción de muestras,
  organización y nota del equipo.
- `claude` (`04a584d`): red de confianza de la portada desde la API, ajustes de
  Collaborators, nuevo cierre y puerta de Collaborators trasladada a Nosotros.
- `MegaClos` (`6ea4129`): formularios reutilizables de los tres operadores,
  validación y persistencia de solicitudes, bandeja de administración, mejoras
  de lectura, Contacto, Registro y enlaces a secciones.
- `mini-codex` (`e0e12d9`): exclusión de su `TODO.md` personal.
- `mini-codex2`: sin cambios nuevos desde la entrega del 5 de octubre.

## Decisiones de merge

Se leyeron las notas de `clos` y `claude` y `docs/formularios.md`.
En Nosotros manda la estructura de `clos`; sobre ella se conserva la puerta
blanca de `claude`, su texto y el acceso a Collaborators. No se restaura la
antigua Trayectoria ni su servicio de confianza en Nosotros. Las mejoras
compatibles de lectura de MegaClos permanecen; el énfasis claro de la
arquitectura no se aplica a la tarjeta blanca de invitación.

Los conflictos en `script_bbdd.sql` y `api.models.ts` se resolvieron conservando
las dos ampliaciones: red de confianza y solicitudes, con sus contratos propios.
Las reglas públicas de seguridad de ambas API conviven con la protección del admin.

La nota de claude estaba sin commit: se archiva una copia con fecha en
[claude-2026-10-07.md](claude-2026-10-07.md). El original local y sus cuatro imágenes
alternativas `alienmilk-closing-{bubbles,milkyway,shop,sphere}.webp` se conservan
sin incorporarlas a Git. El cierre integrado usa `alienmilk-closing-toast.webp`.
El vídeo local de Getty permanece igualmente fuera de Git.

## Comprobaciones

- `pnpm check`: lint, 22 pruebas y build correctos.
- `./mvnw -q test`: 22 pruebas correctas, incluidas las nuevas de catálogo,
  validación, limitación de envíos, contrato HTTP y cableado de solicitudes.
- Navegador: portada, Nosotros, Contacto, Registro, Sesiones y los tres operadores
  a 390×844, 1280×720, 1536×750 y 1920×1080; sin desbordamiento horizontal ni
  errores de JavaScript durante la comprobación de carga.
- Revisión visual de puerta y red de confianza; pestañas de arquitectura abren,
  cambian y se repliegan. Se conserva la invitación de Collaborators.
- Los tres diálogos cargan sus campos y muestran errores de campos obligatorios.
- Envío real local desde el navegador a AM Transit: resguardo generado, solicitud
  recuperada con el admin de demostración, cambio a `ATENDIDA` (200), borrado de
  esa misma prueba (204) y ausencia posterior verificada. No se enviaron correos.
- Backend compartido reiniciado. Red de confianza y definición de formulario
  responden 200; Continuidad devuelve 217 años calculados desde 1809.

## Migraciones

Aplicar en otras bases antes de arrancar esta versión:

- `reto-eventos-backend/migraciones/2026-10-07-red-confianza.sql`
- `reto-eventos-backend/migraciones/2026-10-07-solicitudes.sql`

Las cuatro tablas (`socio`, `premio`, `cifra_confianza`, `solicitudes`) ya estaban
en la base local compartida. Se comprobó su uso a través de las API. No se ejecutó
el script de recreación de la base.

## Pendientes e incoherencias observadas

1. **Imágenes de Nosotros:** faltan las tres fotos de Archivo, Laboratorio y
   Sesión, señaladas en las notas de clos; se mantienen los huecos previstos.
2. **Red de confianza:** los datos de reserva están duplicados en el frontend.
   La API calcula Continuidad, pero la reserva contiene `217` fijo. Además, una
   respuesta correcta con listas vacías conserva la reserva en vez de vaciarla;
   conviene distinguir una colección vacía de una API no disponible.
3. **Limitación de envíos:** el controlador confía en el último valor de
   `X-Forwarded-For`, suponiendo un Apache delante. Antes de desplegar, verificar
   esa topología y el acceso al backend; un acceso directo permite inventar esa
   cabecera. El límite global sigue existiendo y el contador vive en memoria.
4. **Formularios y contenido:** Kepler pide quince días de antelación en la ayuda,
   pero `desdeHoy` solo impide fechas pasadas. La confirmación promete respuesta
   por correo; esta implementación guarda en la bandeja y registra un evento,
   sin envío de email. La política de privacidad enlazada sigue provisional.
5. **Tamaños:** Ubicaciones 47,35 kB, Portada 41,70 kB, Nosotros 38,25 kB,
   Sesiones 28,99 kB y Contacto 23,93 kB. Error de CSS en 48 kB; Ubicaciones
   sigue cerca. Bundle inicial 561,67 kB, por encima del aviso de 500 kB.
   La build pasa sin aumentar límites.
6. **Deuda anterior:** MariaDB con conector/dialecto MySQL sigue avisando de
   `Unknown column 'RESERVED'`; Registro/Login duplican estilos; quedan las dos
   rutas de detalle de sesiones y horarios editoriales. El texto de Renfe de
   Contacto señalado en la entrega anterior sigue pendiente de revisión.
