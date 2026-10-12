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
  desde el enlace privado, y sus unidades vuelven al almacén (ver el cobro, más abajo). Los estados `ENVIADO` y `ENTREGADO` existen para un
  futuro panel de administración.

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

Claves del entorno de prueba en `.env.local` (`STRIPE_SECRET_KEY`), y la CLI de Stripe para recibir
los avisos en el ordenador. Tarjeta de prueba: `4242 4242 4242 4242`, fecha futura y CVC cualquiera.

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
- **Pendiente:** el correo de confirmación con el enlace, cuando esté configurado el aviso por correo
  (ver [formularios](formularios.md#aviso-por-correo)).

## Productos

Los nueve productos iniciales están en `migraciones/2026-10-09-tienda.sql`. Para añadir uno basta
con una fila en `productos`:

- `slug`: la dirección de la ficha.
- `categoria`: `LECHE`, `DERIVADO` o `MESA`.
- `tono`: el color de la muestra. Se define en `features/shop/shop-shared.css`.
- `orden`: la posición en el catálogo.
- `activo = FALSE` retira el producto sin borrar los pedidos que lo incluyen.

## Base de datos

Aplicar, en este orden y en cualquier base existente (las tres son idempotentes):

1. `reto-eventos-backend/migraciones/2026-10-09-tienda.sql`: crea `productos`, `pedidos` y
   `lineas_pedido` con el catálogo inicial.
. `reto-eventos-backend/migraciones/2026-10-12-tienda-pagos.sql`: estado `PENDIENTE_PAGO` y los
   datos del cobro (sesión, plazo, pago y reembolso).
