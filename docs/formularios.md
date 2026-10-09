# Formularios públicos

Todos los formularios que envían una solicitud desde la web (por ahora, los de los operadores
asociados) usan el mismo molde. Cada formulario es **un archivo JSON**; añadir uno o cambiar sus
campos no requiere código.

## Cómo funciona

```
resources/formularios/<clave>.json   ← la definición: única fuente de verdad
        │
        ├─ GET  /api/formularios/<clave>              el frontend pinta el formulario con ella
        ├─ POST /api/formularios/<clave>/solicitudes  el backend valida contra ella y guarda
        └─ /admin → Solicitudes                       la bandeja muestra los datos con sus etiquetas
```

- **Backend:** `CatalogoFormularios` carga y comprueba los JSON al arrancar (una definición mal
  escrita impide arrancar). `ValidadorSolicitud` valida los valores y devuelve un mensaje por campo.
  `SolicitudServiceImpl` guarda la solicitud en la tabla `solicitudes` y devuelve el resguardo.
- **Frontend:** `<app-request-form formKey="…">` pinta, valida y envía cualquier formulario;
  `<app-request-dialog>` lo abre en un diálogo. La bandeja del admin es
  `admin-requests-panel`.
- **Datos:** nombre y correo van en columnas propias; el resto, en `datos` (JSON), cada valor con
  la etiqueta que tenía al enviarse. Si un formulario cambia, las solicitudes antiguas se siguen
  leyendo bien.

## Añadir un formulario

1. Crear `reto-eventos-backend/src/main/resources/formularios/<clave>.json`. El archivo se llama
   como su clave (minúsculas y guiones):

   ```json
   {
     "clave": "prensa",
     "titulo": "Solicitud de prensa",
     "organizacion": "AlienMilk",
     "prefijo": "PR",
     "introduccion": "Texto breve opcional sobre el formulario.",
     "accion": "Enviar solicitud",
     "confirmacion": "Texto que acompaña al resguardo (PR-2026-0001).",
     "campos": [
       { "clave": "nombre", "etiqueta": "Nombre", "tipo": "texto", "requerido": true, "maximo": 80, "ancho": "mitad", "autocompletar": "name" },
       { "clave": "email", "etiqueta": "Correo electrónico", "tipo": "email", "requerido": true, "maximo": 100, "ancho": "mitad", "autocompletar": "email" },
       { "clave": "medio", "etiqueta": "Medio", "tipo": "texto", "requerido": true }
     ]
   }
   ```

2. Ponerlo en la página que toque:

   ```html
   <button type="button" class="line-action" (click)="dialog.open()">Solicitar</button>
   <app-request-dialog #dialog formKey="prensa" />
   ```

   o, sin diálogo, `<app-request-form formKey="prensa" />`.

3. Reiniciar el backend. No hace falta migración: la tabla `solicitudes` sirve para todos.

## Campos

| Propiedad | Uso |
|---|---|
| `clave` | Nombre del dato. **Todo formulario lleva `nombre` (texto) y `email` (email) obligatorios.** |
| `etiqueta` | Lo que ve el visitante y lo que se guarda junto al valor. |
| `tipo` | `texto`, `email`, `texto-largo`, `numero`, `fecha` o `seleccion`. |
| `requerido` | `true` si no puede quedar vacío. |
| `minimo` / `maximo` | Números: valor mínimo y máximo. Textos: `maximo` es la longitud (por defecto 120; 1000 en `texto-largo`). |
| `opciones` | Valores admitidos en una `seleccion`. |
| `desdeHoy` | En una `fecha`, no admite días pasados. |
| `ayuda` | Texto breve bajo el campo. |
| `ancho` | `"mitad"` comparte fila con el campo siguiente en pantallas anchas. |
| `autocompletar` | Valor de `autocomplete` para el navegador (`name`, `email`, `organization`…). |

## Aviso por correo

Cada solicitud guardada puede avisar por correo (`AvisoSolicitudes`). El correo lleva la referencia
en el asunto, todos los datos con sus etiquetas y un enlace a la bandeja; **responderlo escribe
directamente al visitante** (va con su dirección en `Reply-To`). Sirve igual para todos los
formularios, sin tocar nada por formulario.

Se envía en segundo plano y después de guardar: el visitante recibe su resguardo aunque el correo
tarde o falle. Un fallo pasajero se reintenta dos veces (a los 30 s y a los 2 min); una cuenta
rechazada no se reintenta. Pase lo que pase, la solicitud sigue en `/admin`.

Se enciende con variables de entorno (ver `.env.local.example`). Sin ellas queda apagado, y al
arrancar el log dice en qué estado está y qué falta:

| Variable | Uso |
|---|---|
| `SPRING_MAIL_HOST` | Servidor SMTP (`smtp.gmail.com`). Puerto 587 con STARTTLS por defecto. |
| `SPRING_MAIL_USERNAME` / `SPRING_MAIL_PASSWORD` | La cuenta que envía. Con Gmail, una contraseña de aplicación. |
| `AVISOS_CORREO_DESTINO` | A quién se avisa. |
| `AVISOS_CORREO_PANEL` | Opcional: enlace a la bandeja que se añade al correo. |

Lo que no es secreto (puerto, STARTTLS obligatorio, tiempos de espera) está en
`resources/avisos-correo.properties`; cualquier variable de entorno lo sustituye.

## Protecciones

- **Campo trampa:** un campo `web` oculto que solo rellenan los robots; esas solicitudes se
  responden como enviadas pero no se guardan.
- **Límite de envíos:** 5 por origen cada 15 minutos y 60 en total por hora (respuesta 429).
- **Privacidad:** el envío exige aceptar la política de privacidad.
