import { CondicionesTienda, Producto } from '../../models/api.models';
import { formatPrice, maxUnits, shippingCost, stockLabel, stockLevel } from './shop-format';

const terms: CondicionesTienda = { gastosEnvio: 4.9, envioGratisDesde: 40, unidadesMaximas: 6 };

function product(existencias: number): Producto {
  return {
    slug: 'leche-de-pelagia',
    nombre: 'Leche de Pelagia',
    categoria: 'LECHE',
    resumen: '',
    descripcion: '',
    procedencia: 'Estación Pelagia · AE03, Lagos',
    formato: '500 ml',
    lote: 'AM-L-0512',
    conservacion: '',
    distribucion: '',
    advertencia: null,
    precio: 9.8,
    existencias,
    tono: 'glaciar',
  };
}

describe('shop format', () => {
  it('formats prices the Spanish way, with the euro sign kept on the same line', () => {
    expect(formatPrice(9.8)).toBe('9,80\u00a0€');
  });

  it('warns about low stock and sold-out products', () => {
    expect([stockLevel(product(0)), stockLabel(product(0))]).toEqual(['out', 'Agotado']);
    expect(stockLabel(product(1))).toBe('Última unidad');
    expect([stockLevel(product(8)), stockLabel(product(8))]).toEqual(['low', 'Últimas 8 unidades']);
    expect([stockLevel(product(148)), stockLabel(product(148))]).toEqual(['ok', '148 unidades']);
  });

  it('never offers more than what is left or the per-order limit', () => {
    expect(maxUnits(product(3), terms)).toBe(3);
    expect(maxUnits(product(148), terms)).toBe(6);
    expect(maxUnits(product(0), terms)).toBe(0);
  });

  it('announces the same shipping the server will charge', () => {
    expect(shippingCost('ENVIO', 39.99, terms)).toBe(4.9);
    expect(shippingCost('ENVIO', 40, terms)).toBe(0);
    expect(shippingCost('RECOGIDA', 10, terms)).toBe(0);
  });
});
