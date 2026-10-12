import { Pedido } from '../../models/api.models';
import { rememberPayment, takePayment } from './pending-payment';

const order = { referencia: 'AMD-2026-0042', idPedido: 42 } as Pedido;

describe('pending payment', () => {
  beforeEach(() => sessionStorage.clear());

  it('remembers the order being paid and gives it back only once', () => {
    rememberPayment(order, 'clave-del-invitado');

    expect(takePayment()).toEqual({ referencia: 'AMD-2026-0042', idPedido: 42, clave: 'clave-del-invitado' });
    expect(takePayment()).toBeNull();
  });

  it('keeps no key for account orders', () => {
    rememberPayment(order);

    expect(takePayment()).toEqual({ referencia: 'AMD-2026-0042', idPedido: 42 });
  });

  it('ignores whatever else is stored under its name', () => {
    sessionStorage.setItem('alienmilk-tienda-pago', '{"referencia": 7}');
    expect(takePayment()).toBeNull();

    sessionStorage.setItem('alienmilk-tienda-pago', 'no es json');
    expect(takePayment()).toBeNull();
  });
});
