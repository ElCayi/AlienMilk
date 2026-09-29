# Notas de merge — rama `mini-codex2`

Comprobado el 2026-09-26 tras actualizar `origin`. Esta rama parte de `d877024` y ajusta las secciones móviles de la portada: el carrusel de sesiones, la presentación de ubicaciones y la sección de colaboración.

## Conflictos detectados

`git merge-tree --write-tree` detecta los mismos dos conflictos al integrar esta rama con `origin/main`, `origin/mini-codex`, `origin/claude` u `origin/clos`:

| Archivo | Qué coincide | Resolución sugerida |
| --- | --- | --- |
| `reto-eventos-frontend/src/app/pages/home/styles/home-content.css` | `main` reformateó el archivo completo y esta rama cambió dos reglas de sesiones. | Partir de la versión reformateada de `main`. En `.session-file-heading`, conservar `justify-content: flex-start` y `gap: 0.55rem`. En `.session-action`, conservar la transición y los estados `:active` del enlace y su subrayado. Mantener los cambios de la CTA final de `main`. |
| `reto-eventos-frontend/src/app/pages/home/styles/home-session-bubbles.css` | Ambas ramas cambiaron las flechas del carrusel móvil: `main` las dimensiona a `3.25rem`; esta rama usa controles más grandes y estiliza el SVG. | Decidir el aspecto final de las flechas viendo la portada en móvil. Conservar de esta rama el contenedor `.session-visual`, la paginación, la disposición de la ficha y sus reglas de interacción; integrar las reglas de flechas escogidas sin duplicar selectores. |

Las otras ramas citadas no cambian estos dos archivos respecto de `main`; los conflictos proceden de la divergencia con `main`.

## Combinaciones automáticas que conviene revisar

- `locations-atlas.component.css` se combina automáticamente con `main`, pero ambas ramas lo modifican. Esta rama añade una clase de host condicionada por `collaborationMode` en `locations-atlas.component.ts` para usar `--page-canvas` en esa sección móvil, y ajusta el texto de las cifras. Revisar en móvil la unión entre ubicaciones y colaboración, especialmente el fondo y el desbordamiento del texto.
- `home-responsive.css` y `sample-reception.component.css` también se combinan automáticamente aunque los modifica `main`. Comprobar el espaciado de las secciones de sesiones y colaboración tras el merge.
- `sessions-program.component.html` pertenece a esta rama. Mantener su contenedor `.session-visual` y los botones de paginación junto con las reglas CSS correspondientes; de lo contrario el carrusel pierde su estructura móvil.

Después de resolver, comprobar la portada a anchuras móviles (sobre todo alrededor de 520 y 900 px), las flechas y la paginación del carrusel, y el fondo de la sección de colaboración.

## Estado después de la integración

La integración común quedó en `fe9cacc`. Los ajustes móviles de esta rama siguen
presentes, pero el commit `4d69aa8` reorganizó las hojas de estilo. Para futuras
ediciones:

- `home-session-bubbles.css` pasó a llamarse `home-session-mobile.css`. Ahí viven
  ahora las flechas, la paginación, la composición móvil del escaparate y los tamaños
  adaptativos de sus títulos. No se debe recrear el archivo antiguo.
- Las reglas móviles del planetario y de sus tarjetas desplegables están en
  `features/locations/styles/locations-responsive.css`; la estructura base de esas
  tarjetas está en `locations-chart.css`.
- `home-content.css` se eliminó y su contenido se repartió entre
  `home-editorial.css`, `home-final-cta.css`, `home-session-content.css` y otras hojas
  de `pages/home/styles/`.
- `home-page.component.css` y `locations-atlas.component.css` son ahora índices de
  imports. Su orden forma parte de la cascada: antes de mover una regla entre hojas,
  hay que revisar qué archivo se carga después.

El carrusel conserva `.session-visual`, los botones de paginación y las reglas de
interacción; Localizaciones conserva el ancho móvil completo, el chevron desplegable
y el espaciado interior ampliado de `.location-data`.

## Contacto — ampliación editorial, 2026-09-29

- Cambian los tres archivos de `pages/contact/contact-page.component.*`. Se conservan la
  franja oscura de las migas, el tamaño de título compartido con Sesiones, el estado horario
  y el ajuste óptico de la hora local.
- La ficha compacta pasa a un directorio con cuatro motivos de consulta, información ampliada
  para visitantes, una entrada propia a Collaborators y preguntas desplegables nativas.
- Dirección, ciudad, teléfono, correo, horarios, acceso y transporte siguen leyendo
  `ContactService`: no se cambia la base compartida ni el contrato del backend/admin.
  Las áreas de consulta son contenido editorial del componente, no nuevos campos del admin.
- Los enlaces de consulta abren el correo configurado con un asunto específico. No hay un
  endpoint de mensajes, envío automático ni buzones nuevos. Collaborators conserva el flujo
  de primera consulta por correo y se presenta como unidad hermana de Sessions.
- `anchorScrolling` está desactivado globalmente. El índice de Contacto desplaza y enfoca
  sus secciones localmente con `goToSection`; no cambiar el router global para este ajuste.
  Evitar enlaces desnudos `#id`: el `base href` los resuelve contra la portada.
- Al fusionar, conservar los estados de carga/error/reintento y revisar 320, 390, 768 y
  1440 px, los enlaces con asunto y las FAQ por teclado. El mapa sigue siendo una búsqueda
  de la dirección configurada, no una ubicación verificada.
