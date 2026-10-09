import { TestBed } from '@angular/core/testing';

import { CartService } from './cart.service';

const STORAGE_KEY = 'alienmilk-tienda-pedido';

describe('CartService', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  function cart(): CartService {
    return TestBed.inject(CartService);
  }

  it('keeps quantities within the limit and drops a product at zero', () => {
    const service = cart();
    service.set('leche-de-pelagia', 9, 6);
    expect(service.quantity('leche-de-pelagia')).toBe(6);

    service.add('copa-de-degustacion', 6);
    service.add('copa-de-degustacion', 6);
    expect(service.units()).toBe(8);

    service.set('leche-de-pelagia', 0, 6);
    expect(service.items()).toEqual({ 'copa-de-degustacion': 2 });
  });

  it('survives a reload through localStorage and ignores what does not look like a cart', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ 'leche-entera-ceto-iv': 2, roto: -1, texto: 'x' }));
    expect(cart().items()).toEqual({ 'leche-entera-ceto-iv': 2 });
  });

  it('saves every change and forgets the cart once it is empty', () => {
    const service = cart();
    service.add('mantequilla-cultivada', 6);
    TestBed.tick();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')).toEqual({ 'mantequilla-cultivada': 1 });

    service.clear();
    TestBed.tick();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
