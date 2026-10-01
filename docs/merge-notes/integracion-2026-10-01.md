# Entrega de la integración — 1 de octubre de 2026

## Incorporado

Las cinco ramas se integraron en `main` sin conflictos de Git:

- `claude` (`1a1331d`): estaciones de la red desde `data/stations.json`, nuevo
  planetario, procedimiento de acceso y presentación de Collaborators.
- `clos` (`552033d`): ticket y expediente de sesiones adaptados a la pantalla,
  créditos de colaboradores, pestañas móviles y cierre con astronauta.
- `MegaClos` (`f41947b`): nuevo login y registro con usuario, correo y contraseña;
  el backend asigna un nombre inicial cuando el formulario no lo envía.
- `mini-codex` (`5ff5fc7`): cultivo visual de Nosotros, nota de presentación y
  nueva sección de campo. Incluye el último commit confirmado antes del merge.
- `mini-codex2` (`6d5fad9`): ajustes del índice y del planeta de Contacto.

Se conserva `8b334d7` de `main`: MariaDB y backend compartidos, un frontend por
worktree. Los cambios locales de `scripts/_env.sh` en las ramas eran idénticos a
esa versión y quedan recogidos en el historial común. `appFitLine`, añadido en
dos ramas con el mismo contenido, se integra en una sola directiva.

## Validación

- `pnpm check`: lint, 22 pruebas y build de producción correctos.
- `./mvnw -q test`: las cinco pruebas existentes del backend pasan.
- Tres nuevas pruebas del contrato HTTP de registro pasan: formulario de tres
  campos, nombre inicial limitado al tamaño de la columna y conservación de un
  nombre explícito enviado por un cliente anterior. Usan servicios simulados y
  no crean usuarios en la base compartida.
- Navegador: portada, Nosotros, Sesiones, Login, Registro y Contacto a 390,
  1366 y 1920 px, sin desbordamiento horizontal. Se verificó la carga de datos
  desde la API, las notas de cata y el desplegable de estaciones.
- Backend compartido arrancado con la versión integrada y API de contacto
  comprobada con respuesta HTTP 200.

## Pendientes que conviene tener presentes

1. CSS combinado: Ubicaciones **46,55 kB**, Portada **45,87 kB** y Sesiones
   **31,40 kB**. El límite de error sigue en **48 kB**; los dos primeros tienen
   poco margen. El bundle inicial alcanza **521,67 kB** y supera el aviso de
   500 kB. La build pasa; no se han aumentado los límites.
2. Registro copia gran parte del CSS de Login. Conviene extraer una base común
   cuando se vuelvan a modificar ambos, para evitar que las correcciones diverjan.
3. Los enlaces `/operadores/*` y `/documentacion/asistentes` todavía no tienen
   rutas propias; el comodín los devuelve al inicio. Falta implementar esos
   destinos o acordar cómo presentar su estado provisional.
4. Las estaciones son contenido estático, independiente de los eventos. Si se
   quieren editar desde el admin, necesitan su propio contrato con la API.
5. En los expedientes, `estacion` ha sido sustituido por `colaboradores` en los
   modelos y el JSON. No restaurar el contrato antiguo al continuar el trabajo.
   Sigue pendiente decidir entre `/eventos/:id` y `/sesiones?sesion=:id`, y
   resolver los horarios editoriales escritos a mano.
6. El backend pasa sus pruebas, pero Hibernate avisa al consultar metadatos de
   MariaDB con el conector/configuración MySQL (`Unknown column 'RESERVED'`).
   Conviene revisar esa combinación; no fue un fallo de compilación ni de pruebas.

El vídeo `GettyImages-1300560899.mov` permanece fuera de Git. No hay nuevas
migraciones de base de datos en esta integración.
