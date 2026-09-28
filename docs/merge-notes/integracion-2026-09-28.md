# Entrega de la integración — 28 de septiembre de 2026

## Cambios incorporados

- `clos` (`ffda144`): pie extraído a `shared/site-footer`, carrusel móvil del
  ecosistema, créditos, rutas legales provisionales y rediseño de Nosotros con
  su composición visual animada.
- `claude` (`1be636f`): efectos líquidos de la portada, ajustes del planetario y
  composición de las secciones. Se conserva su decisión final de retirar la
  transición animada entre escaparates.
- `mini-codex` (`e80f8ca`): ajustes de cabecera y expediente de sesiones, incluida
  la composición móvil.
- `mini-codex2` (`3e641cc`): integración de su historial y notas. Su rediseño del
  login y las cuentas de demostración ya estaban en `main` mediante `447b35a`;
  se conservan también los refinamientos posteriores de `7cc76ce`.

Los conflictos de `app.css` se resolvieron conservando el nuevo componente de
pie: sus estilos ya no pertenecen al componente raíz. Los conflictos del login
se resolvieron con la versión más reciente de `main`, sin restaurar el diseño
anterior ni perder sus ajustes de tipografía y distribución.

## Comprobaciones

- `pnpm check`: lint, 22 pruebas y build de producción correctos.
- Backend: `./mvnw -q compile` correcto.
- Navegador: portada, Nosotros, sesiones con expediente, login, contacto y aviso
  legal a 390, 1366 y 1920 px, sin desbordamiento horizontal. Revisado también el
  cambio de tarjeta del carrusel móvil del pie.

## Pendientes y criterios para continuar

1. En el worktree de `mini-codex` siguen sin commit tres archivos de
   `pages/sessions/styles/`: `sessions-details.css`, `sessions-dossier.css` y
   `sessions-responsive.css`. No forman parte de esta entrega; falta confirmar
   que esos ajustes están terminados antes de incorporarlos.
2. El CSS combinado de portada alcanza **45,26 kB**, frente al límite de error
   de **48 kB**. Ubicaciones ocupa **23,29 kB**. Ambos superan el aviso de 20 kB,
   pero la build pasa. Antes de ampliar la portada, revisar reglas duplicadas
   y estilos obsoletos; repartir archivos no reduce el total compilado.
3. Continúa la deuda de sesiones: expedientes editoriales en JSON asociados a
   IDs de eventos y horarios escritos a mano; conviven `/eventos/:id` y
   `/sesiones?sesion=:id`. La ficha antigua tiene pendiente revisar el contraste
   de texto. Son decisiones pendientes de producto y datos, no conflictos de Git.
4. `/aviso-legal`, `/privacidad` y `/cookies` son páginas provisionales; faltan los
   textos definitivos. Las redes del pie sin URL tampoco están operativas.

Para trabajar sobre el pie, editar `shared/site-footer`; cada página controla
su separación final. Para los estilos de portada, ubicaciones y sesiones,
mantener el orden de imports de cada `.component.css`.

No hay nuevas migraciones de base de datos respecto de `main` al comenzar esta
integración. Los worktrees que aún ejecuten un backend anterior al login con
cuentas demo necesitan reiniciarlo para disponer de ese endpoint.

El vídeo local `GettyImages-1300560899.mov` continúa fuera de Git.
