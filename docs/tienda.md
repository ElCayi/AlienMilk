# Tienda

`/tienda` vende los productos de AlienMilk: leches, derivados y lo necesario para la mesa. Cada
producto tiene su ficha en `/tienda/<slug>`. Es una tienda de demostración: los pedidos se
registran y descuentan existencias, pero no se cobra ni se envía nada.

## Cómo funciona

```
productos (base de datos) ──▶ GET  /api/tienda/catalogo         catálogo y condiciones, público
                          ──▶ GET  /api/tienda/productos/<slug>  un producto, público
carrito (localStorage)    ──▶ POST /api/tienda/pedidos           con sesión: crea el pedido
                              GET  /api/tienda/pedidos           con sesión: los pedidos propios
                              POST /api/tienda/pedidos/<id>/anulacion
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
- **Anulación.** Un pedido `CONFIRMADO` propio se puede anular desde el historial, y sus unidades
  vuelven al almacén. Los estados `ENVIADO` y `ENTREGADO` existen para un futuro panel de
  administración.

## Productos

Los nueve productos iniciales están en `migraciones/2026-10-09-tienda.sql`. Para añadir uno basta
con una fila en `productos`:

- `slug`: la dirección de la ficha.
- `categoria`: `LECHE`, `DERIVADO` o `MESA`.
- `tono`: el color de la muestra. Se define en `features/shop/shop-shared.css`.
- `orden`: la posición en el catálogo.
- `activo = FALSE` retira el producto sin borrar los pedidos que lo incluyen.

## Base de datos

Aplicar `reto-eventos-backend/migraciones/2026-10-09-tienda.sql` en cualquier base existente. Es
idempotente y crea `productos`, `pedidos` y `lineas_pedido` con el catálogo inicial.
