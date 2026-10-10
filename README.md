# AlienMilk — Reto Reserva de Eventos

Aplicación de gestión de eventos y reservas. Angular 21 en el frontend, Spring Boot
en el backend, MySQL/MariaDB de base de datos.

```
reto-eventos-frontend/   Angular 21 (pnpm)
reto-eventos-backend/    Spring Boot (Maven, Java 21)
scripts/                 arranque, parada, despliegue y copias de la BBDD
docs/                    guía de despliegue y notas de desarrollo
```

## Arrancar el proyecto

### Lo que hace falta

| | |
|---|---|
| Node | 22 |
| pnpm | 11 o superior |
| Java | 21 (solo para el backend) |
| MySQL/MariaDB | servidor y cliente |

**Con Nix + direnv** (lo que usamos nosotros) no hay que instalar nada: `direnv allow`
en la raíz y el entorno queda montado con las versiones correctas.

```bash
cd AlienMilk
direnv allow
```

**Sin Nix** basta con tener esas cuatro cosas instaladas por el medio que sea. El
proyecto no depende de Nix para funcionar.

### Frontend

```bash
bash scripts/dev.sh
```

Arranca MariaDB, Spring Boot en <http://127.0.0.1:8081> y Angular en
<http://127.0.0.1:4300/> bajo el supervisor de scripts. Para detenerlos:

```bash
bash scripts/stop.sh
```

Las dependencias se instalan solas la primera vez, y también cuando el
`pnpm-lock.yaml` va por delante del `node_modules` (por ejemplo tras cambiar de rama).
Se usa `--frozen-lockfile`, que se niega a reescribir el lockfile: así el árbol de
dependencias es idéntico en todas las máquinas.

La parada es idempotente y verifica que cada proceso y su puerto hayan desaparecido;
se puede ejecutar aunque no haya nada corriendo.

El frontend reenvía `/api` al Spring Boot local. Si se usan las credenciales del
perfil `prod`, `DB_USER` y `DB_PASS` deben estar ya disponibles
en el entorno antes de ejecutar el script (ver `.env.local.example`).

## Varias copias a la vez (worktrees)

Se pueden tener varias copias del frontend corriendo en paralelo, una por worktree,
para compararlas en pantalla. Cada una usa su propio puerto.

En nuestro entorno local, `wt session up` crea o abre la sesión del proyecto: arranca
los servicios compartidos en el worktree principal y abre una ventana por worktree.
Si la sesión ya existe, vuelve a ella sin reiniciar los servicios. La topología se
declara en `worktree.toml`: MariaDB y Spring Boot viven en el worktree principal;
cada worktree tiene su frontend, que reenvía `/api` al backend compartido del puerto 8081.

En cada ventana, `.workmux.yaml` ejecuta automáticamente:

```bash
wt svc up
```

La base local se conserva en `.dev-state/` y no entra en Git. `wt svc down` para
el frontend de este worktree; los servicios compartidos siguen mientras otro
worktree los use. `wt session down` para todos los servicios y la sesión completa.

`worktree.toml` declara qué variables cambian de un worktree a otro. Los valores
concretos van en un `.env.worktree` que **no está en git** y que `dev.sh` lee solo si
existe:

```sh
WORKTREE_SLUG=mi_rama
FRONTEND_PORT=45110
BACKEND_PORT=45111
DB_PORT=45112
```

**Sin ese fichero no pasa nada**: se usan 4300, 8081 y 3306. Un clon recién hecho
arranca sin saber que esto existe.

En nuestras máquinas ese fichero lo escribe una herramienta al crear el worktree; en
cualquier otra se escribe a mano leyendo `worktree.toml`.

En el modo normal, `$BACKEND_PORT` queda reservado para `wt svc up --standalone`.
Ese modo levanta un backend y una base privados usando los puertos asignados.

## Comprobar antes de subir

```bash
cd reto-eventos-frontend
pnpm check          # lint + tests + build
```

Los estilos de la portada, ubicaciones y sesiones están repartidos en hojas por
sección. Cada componente las importa en orden desde su `.component.css`; ese orden
forma parte de la cascada y debe conservarse al mover reglas. El presupuesto
`anyComponentStyle` mide el CSS combinado de cada componente, aunque sus reglas
vivan en varios archivos. Avisa a partir de 20 kB y detiene la build a los 48 kB.

## Nota sobre las dependencias

pnpm 11 **no ejecuta los scripts de instalación** de las dependencias salvo que estén
autorizados uno a uno en `pnpm-workspace.yaml`. Es una protección contra ataques de
cadena de suministro: los `postinstall` son la vía más usada para colar código.

Si una instalación falla porque un script no se ejecutó, **eso es la protección
funcionando**. Antes de autorizar nada hay que averiguar qué hace ese script. Los
cuatro que aparecen hoy están en `false` a conciencia: se comprobó que el build,
`ng serve` y el modo watch funcionan sin ellos.

## Documentación

- [Identidad de AlienMilk](docs/identidad-alienmilk.md) — voz, tono y criterio de la
  marca; leer antes de escribir texto, diseñar o proponer funcionalidades
- [Trabajar en paralelo](docs/colaboracion.md) — worktrees, merges, migraciones de base de
  datos, servicios y CSS; leer antes de editar o fusionar
- [Formularios públicos](docs/formularios.md) — el molde: un JSON por formulario, sin código
- [Tienda](docs/tienda.md) — catálogo, carrito y pedidos con o sin cuenta, con existencias calculadas en el servidor
- [Entrega de la integración](docs/merge-notes/integracion-2026-10-07.md) —
  cambios incorporados, comprobaciones y puntos pendientes para colaboradores
- [Guía de despliegue](docs/guia-despliegue.md) — puesta en producción
- [Del navegador a nvim](docs/click-a-nvim.md) — pinchar un componente en la página y
  abrirlo en el editor (requiere nuestro entorno Nix)
