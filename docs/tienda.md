# Tienda

`/tienda` vende los productos de AlienMilk: leches, derivados y lo necesario para la mesa. Cada
producto tiene su ficha en `/tienda/<slug>`. Con clave de Stripe se paga con tarjeta en Stripe
Checkout (en el entorno de prueba: no se cobra nada); sin ella, la tienda confirma los pedidos sin
cobrar. En ningún caso se envía nada.

## Cómo funciona

```
productos (base de datos) ──▶ GET  /api/tienda/catalogo              catálogo y condiciones, público
                          ──▶ GET  /api/tienda/productos/<slug>       un producto, público
carrito (localStorage)    ──▶ POST /api/tienda/pedidos                con sesión o como invitado
                              GET  /api/tienda/pedidos                con sesión: los pedidos propios
                              POST /api/tienda/pedidos/<id>/anulacion con sesión
enlace privado            ──▶ GET  /api/tienda/consulta/<referencia>  invitado, con X-Clave-Pedido
                              POST /api/tienda/consulta/<referencia>/anulacion
Stripe                    ──▶ POST /api/tienda/pagos/aviso           avisos (webhooks), con firma
```

- **El servidor manda.** El carrito solo envía qué productos y cuántas unidades. Precios, gastos de
  envío y total los calcula `TiendaServiceImpl` con los datos de la base. Nombre y precio se copian
  en cada línea del pedido, así que un pedido antiguo sigue diciendo lo que se compró y a qué precio.
- **Existencias sin carreras.** Las unidades de cada producto se retiran con un único
  `UPDATE … WHERE existencias >= n`. Dos pedidos simultáneos no pueden llevarse la misma unidad, y si
  falta alguna se deshace el pedido entero en la misma transacción. La base lo refuerza con
  `CHECK (existencias >= 0)`.
- **Condiciones en un solo sitio.** Gastos de envío (4,90 €), envío gratis desde 40 € y un máximo de
  6 unidades por producto son constantes del servicio. Llegan al frontend con el catálogo, que las
  anuncia sin tenerlas duplicadas.
- **Anulación.** Un pedido pendiente de pago o `CONFIRMADO` se puede anular, desde el historial o
  desde el enlace privado, y sus unidades vuelven al almacén (ver el cobro, más abajo). Cuando sale
  del centro de distribución ya no se puede anular.

## Gestión de pedidos (/admin → Pedidos)

El centro de distribución lleva cada pedido pagado hasta su entrega:

```
CONFIRMADO ──Marcar enviado──▶ ENVIADO ──Marcar entregado──▶ ENTREGADO     (envío refrigerado)
CONFIRMADO ──Marcar recogido─────────────────────────────▶ ENTREGADO     (recogida en la sede)
CONFIRMADO / PENDIENTE_PAGO ──Anular──▶ ANULADO   (con devolución si se cobró)
```

- **Las reglas, en el servidor.** `GET /api/admin/pedidos` devuelve cada pedido con `siguiente` (el
  paso que le toca, o vacío) y `anulable`; el panel solo enseña esos botones. `PATCH
  /api/admin/pedidos/{id}` con `{"estado": "ENVIADO"}` da un paso, y responde 409 si no es el que
  toca: no se puede saltar ni volver atrás. Cada cambio bloquea antes la fila, como el cobro.
- **Fechas.** `enviado_en` y `entregado_en` se guardan con el paso, y el resguardo del cliente las
  muestra («Ha salido del centro de distribución el 13 de octubre…»).
- **Anular desde el admin** (`POST /api/admin/pedidos/{id}/anulacion`) es la misma anulación del
  cliente: cierra la página de pago o devuelve el cobro, y las unidades vuelven al almacén.
- **Bandejas:** por preparar, en camino, pendientes de pago, cerrados y todos. Cada tarjeta lleva
  el comprador (cuenta o invitado), su correo para escribirle, la entrega, los productos y el cobro.

## Cobro con Stripe Checkout

La tarjeta nunca pasa por este servidor: el comprador paga en la página de Stripe y vuelve.

```
Confirmar ──▶ pedido PENDIENTE_PAGO, unidades reservadas ──▶ página de pago de Stripe (30 min)
                                                               │
        ┌───────────── pagado ──────────────────────────────────┤
        ▼                                                       │ cancelado o caducado
  CONFIRMADO  ◀── aviso firmado, o consulta a Stripe            ▼
        │                                             ANULADO, unidades de vuelta
        └── anular ──▶ reembolso en Stripe ──▶ ANULADO, unidades de vuelta
```

- **Importes del servidor.** `StripePasarela` abre la sesión con las líneas del pedido ya
  calculado (en céntimos) y una clave de idempotencia por pedido: un reintento no crea dos cobros.
- **El aviso es un timbre, no la verdad.** `POST /api/tienda/pagos/aviso` comprueba la firma
  (`STRIPE_WEBHOOK_SECRET`) y su antigüedad, y luego pregunta a Stripe por el estado real de la
  sesión. Así da igual la versión de la API con que se escribió el aviso, y repetirlo no cambia nada.
- **Sin depender del aviso.** Al volver de pagar, el historial o la página del pedido preguntan a
  Stripe por los pedidos pendientes; y `RepasoPagos`, cada cinco minutos, repasa los que pasaron su
  plazo. Si un aviso se pierde, el pedido pagado se confirma igual y el abandonado se anula.
- **Sin carreras.** El aviso, la consulta y una anulación pueden llegar a la vez: cada cambio de
  estado bloquea antes la fila del pedido (`SELECT … FOR UPDATE`) y vuelve a mirar el estado, así
  que las unidades no vuelven dos veces al almacén.
- **Anular.** Pendiente: se cierra la página de pago antes de devolver las unidades (si resulta que
  se acaba de pagar, se sigue como pagado). Pagado: primero el reembolso; si Stripe falla, el pedido
  se queda como estaba.
- **Vuelta a la tienda.** Antes de salir, el navegador guarda en `sessionStorage` qué pedido se
  paga (`features/shop/pending-payment.ts`). Con `?pago=hecho` enseña el resguardo y vacía el
  carrito; con `?pago=cancelado` anula ese intento y deja el carrito como estaba.

### Probarlo en local

Claves del entorno de prueba en el `.env.local` de la copia que aloja el backend: el checkout
principal para el backend compartido, o el worktree con `wt svc up --standalone`. `up.sh` lo carga
al arrancar el backend y apunta `TIENDA_URL` al frontend de esa misma copia. El catálogo dice si
cobra: `pagoConTarjeta: true`. Para recibir los avisos en el ordenador, la CLI de Stripe. Tarjeta
de prueba: `4242 4242 4242 4242`, fecha futura y CVC cualquiera.

```bash
set -a; . ./.env.local; set +a
export STRIPE_API_KEY="$STRIPE_SECRET_KEY"
# Imprime el secreto de los avisos (whsec_…), que el backend necesita en STRIPE_WEBHOOK_SECRET:
nix shell nixpkgs#stripe-cli -c stripe listen --print-secret
nix shell nixpkgs#stripe-cli -c stripe listen --forward-to http://127.0.0.1:8081/api/tienda/pagos/aviso
```

Sin la CLI también funciona: los pedidos se ponen al día al volver de Stripe.

## Comprar sin cuenta

La cuenta es opcional: lo que aporta es el historial, no el permiso para comprar. Sin sesión, el
pedido pide además nombre y correo y se guarda como **pedido de invitado** (sin usuario).

- **Enlace privado.** Al crearlo, el servidor genera una clave de 32 bytes al azar y la devuelve
  una sola vez. El resguardo la muestra como `/tienda/pedido/<referencia>#<clave>`: tras la
  almohadilla, el navegador no la envía a ningún servidor ni la pasa a otras páginas. La página del
  pedido la manda en la cabecera `X-Clave-Pedido`, que tampoco queda en los registros de acceso.
- **En la base, solo la huella.** `pedidos.clave_hash` guarda el SHA-256 de la clave, y se compara
  en tiempo constante. Con una copia de la base no se puede abrir ni anular ningún pedido.
- **Sin pistas.** Referencia inexistente, pedido de una cuenta o clave equivocada responden el mismo
  404: la referencia (`AMD-2026-0007`) es fácil de adivinar, pero no basta.
- **Freno.** Los pedidos de invitado pasan por `LimitadorSolicitudes`, el mismo de los formularios
  públicos, para que nadie pueda vaciar el almacén con un script. Solo cuentan los pedidos bien
  formados.
- **El enlace también llega por correo**, en el primero que recibe el comprador (ver abajo). Es el
  único momento en que el servidor conoce la clave.

## Correos al comprador

`AvisoPedidos` escribe al comprador (al correo de la cuenta o al que dio el invitado) cada vez que
su pedido cambia: **recibido** (confirmado o, con Stripe, reservado con el botón para pagar),
**pagado**, **en camino**, **entregado** o **recogido**, **anulado** (con el reembolso, si lo hubo) y
**anulado por no pagarse a tiempo**. `TiendaServiceImpl` publica un `PedidoAvisoEvent` en cada
cambio; el correo sale en segundo plano y solo si la transacción se confirma, así que un pedido
nunca espera al correo ni falla por él. Las frases son las del resguardo de la tienda
(`CorreoPedido`).

- **Enlaces.** Al invitado, el enlace privado en el primer correo; en los siguientes, que lo busque
  en ese (la clave ya no está). Con cuenta, Mi panel. Todos llevan la política de devoluciones
  (`/tienda#devoluciones`). La web se toma de `TIENDA_URL`.
- **Sin servidor de correo** (sin `SPRING_MAIL_HOST`), no se envía nada: cada correo queda en el
  registro con su referencia y su asunto, sin la dirección del comprador. Es como funciona ahora,
  hasta tener el dominio y el buzón de IONOS.
- **Con servidor**, usa la misma cuenta que el aviso de solicitudes (ver
  [formularios](formularios.md#aviso-por-correo)): remitente «AlienMilk Distribución» y las
  respuestas del comprador a `AVISOS_CORREO_DESTINO`. Dos reintentos si el servidor falla.
- **Probarlo en local** sin mandar nada fuera: `nix shell nixpkgs#mailpit -c mailpit`, y el backend
  con `SPRING_MAIL_HOST=127.0.0.1`, `SPRING_MAIL_PORT=1025` y la autenticación y STARTTLS apagados
  (`SPRING_MAIL_PROPERTIES_MAIL_SMTP_AUTH=false`, `…_STARTTLS_ENABLE=false`,
  `…_STARTTLS_REQUIRED=false`). Los correos se ven en `http://127.0.0.1:8025`.

## Productos

Los nueve productos iniciales están en `migraciones/2026-10-09-tienda.sql`. Para añadir uno basta
con una fila en `productos`:

- `slug`: la dirección de la ficha.
- `categoria`: `LECHE`, `DERIVADO` o `MESA`.
- `tono`: el color de la muestra. Se define en `features/shop/shop-shared.css`.
- `orden`: la posición en el catálogo.
- `activo = FALSE` retira el producto sin borrar los pedidos que lo incluyen.

## Base de datos

Aplicar, en este orden y en cualquier base existente (las cuatro son idempotentes):

1. `reto-eventos-backend/migraciones/2026-10-09-tienda.sql`: crea `productos`, `pedidos` y
   `lineas_pedido` con el catálogo inicial.
2. `reto-eventos-backend/migraciones/2026-10-10-tienda-invitados.sql`: pedidos sin usuario, con
   nombre, correo y huella de la clave.
3. `reto-eventos-backend/migraciones/2026-10-12-tienda-pagos.sql`: estado `PENDIENTE_PAGO` y los
   datos del cobro (sesión, plazo, pago y reembolso).
4. `reto-eventos-backend/migraciones/2026-10-13-tienda-envios.sql`: cuándo salió y cuándo se
   entregó cada pedido.
