# Del navegador a nvim

Pinchar un componente en la página y que se abra su fuente en nvim, en la línea
correcta.

> **Esto es específico de nuestro entorno Nix.** No hace falta para trabajar en el
> proyecto, y el repo no depende de ello: no hay ninguna dependencia, ni plugin de
> build, ni configuración añadida. Quien no tenga este entorno sigue usando las
> DevTools de Chrome con normalidad.

## El problema que resuelve

Ctrl+Shift+C en Chrome selecciona un elemento y te lleva al panel *Elements*. Pero si
trabajas en nvim, el panel de Chrome no es donde quieres acabar: quieres el `.ts` del
componente, abierto, en la línea donde se declara. Ir de uno a otro a mano —leer el
nombre de la etiqueta, buscarlo en el proyecto, abrir el fichero— es el paso que
rompe el ritmo.

## Cómo funciona (y por qué no necesita nada del proyecto)

Angular ya guarda la respuesta. En cualquier compilación de desarrollo, su compilador
emite para cada componente:

```js
ɵsetClassDebugInfo(HomePageComponent, {
  className: "HomePageComponent",
  filePath: "src/app/pages/home/home-page.component.ts",
  lineNumber: 17
})
```

Y `window.ng.getComponent(elemento)` —la API de depuración documentada de Angular— va
del elemento del DOM al componente. Así que el mapa *elemento → fichero:línea* lo
mantiene el equipo de Angular y viene puesto en cada build de desarrollo.

`ng-jump` solo lo lee. No hay que instalar nada en el proyecto, ni escanear el código,
ni mantener nada sincronizado.

```
navegador                        nvim
   │                               ▲
   │ pinchas un componente          │ abre fichero:línea
   ▼                               │
 ng-jump ── lee ɵcmp.debugInfo ────┘
```

## Uso

Hacen falta tres cosas a la vez:

1. **El proyecto corriendo** — `bash scripts/dev.sh`
2. **Un Chromium con depuración remota.** No vale el navegador normal:

   ```bash
   kitty-agent            # abre una terminal nueva, apunta el PID que imprime
   dev-chromium           # dentro de esa terminal; imprime "Port: 9222"
   ```

   Ahí navegas a la URL que te dijo `dev.sh`.
3. **nvim abierto** en algún sitio del proyecto. No hay que configurarlo: nvim ya abre
   un socket por su cuenta.

Y entonces, desde cualquier terminal:

```bash
ng-jump
```

El cursor pasa a modo selección: al pasar por encima se resalta el componente bajo el
puntero y una etiqueta dice cuál es y en qué fichero está. Un clic lo abre en nvim.
Esc cancela.

```bash
ng-jump --dry-run    # solo imprime fichero:línea, no toca nvim
ng-jump --url 45110  # si tienes varias pestañas, para elegir la buena
ng-jump --help
```

## Cómo elige el nvim

nvim abre un socket de control solo, sin configurar nada. `ng-jump` los recorre todos,
le pregunta a cada uno por su directorio de trabajo, y elige **el de directorio más
profundo que contenga el fichero**.

Eso importa con varios worktrees abiertos a la vez: el fichero se abre en el nvim del
worktree al que pertenece, y no en otro que casualmente también lo tenga por debajo.

## Si algo no va

**«no tab whose URL contains …»** — la pestaña no está abierta en ese Chromium, o
estás mirando el navegador normal en vez del de `dev-chromium`. `ng-jump` lista las
pestañas que sí ve.

**«no running nvim has a cwd containing …»** — no hay ningún nvim abierto dentro del
proyecto. Abre uno en la raíz del worktree.

**Se resalta pero dice que no hay componente** — has pinchado un trozo de HTML que no
pertenece a ningún componente de Angular, o el navegador tiene cargada una compilación
de producción, donde `debugInfo` no existe. Comprueba que estás en el servidor de
desarrollo.

## Nota para nvim

Para que el servidor de lenguaje de Angular funcione, **nvim tiene que abrirse dentro
del entorno de direnv**: `cd` al proyecto primero, y luego `nvim`. El servidor es un
script de `node_modules/.bin` que vuelve a llamar al runtime del proyecto, así que sin
Node en el PATH muere sin decir nada y el autocompletado simplemente no aparece.
