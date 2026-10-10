# Tienda

`/tienda` vende los productos de AlienMilk: leches, derivados y lo necesario para la mesa. Cada
producto tiene su ficha en `/tienda/<slug>`. Es una tienda de demostración: los pedidos se
registran y descuentan existencias, pero no se cobra ni se envía nada.

## Cómo funciona

```
productos (base de datos) ──▶ GET  /api/tienda/catalogo              catálogo y condiciones, público
                          ──▶ GET  /api/tienda/productos/<slug>       un producto, público
carrito (localStorage)    ──▶ POST /api/tienda/pedidos                con sesión o como invitado
                              GET  /api/tienda/pedidos                con sesión: los pedidos propios
                              POST /api/tienda/pedidos/<id>/anulacion con sesión
enlace privado            ──▶ GET  /api/tienda/consulta/<referencia>  invitado, con X-Clave-Pedido
                              POST /api/tienda/consulta/<referencia>/anulacion
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
- **Anulación.** Un pedido `CONFIRMADO` se puede anular, desde el historial o desde el enlace
  privado, y sus unidades vuelven al almacén. Los estados `ENVIADO` y `ENTREGADO` existen para un
  futuro panel de administración.

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

Aplicar, en este orden y en cualquier base existente (las dos son idempotentes):

1. `reto-eventos-backend/migraciones/2026-10-09-tienda.sql`: crea `productos`, `pedidos` y
   `lineas_pedido` con el catálogo inicial.
2. `reto-eventos-backend/migraciones/2026-10-10-tienda-invitados.sql`: pedidos sin usuario, con
   nombre, correo y huella de la clave.
