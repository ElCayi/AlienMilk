import { signal } from '@angular/core';

/**
 * El orden de una tabla del panel: pulsar una columna ordena por ella de menor a mayor; volver a
 * pulsarla, al revés. En móvil, sin cabecera que pulsar, lo mismo se elige en un selector
 * («columna:1» o «columna:-1»).
 */
export class TableSort<K extends string> {
  readonly state;

  constructor(key: K, dir: 1 | -1 = 1) {
    this.state = signal<{ key: K; dir: 1 | -1 }>({ key, dir });
  }

  by(key: K): void {
    this.state.update((sort) => ({ key, dir: sort.key === key ? (sort.dir === 1 ? -1 : 1) : 1 }));
  }

  /** Para `aria-sort` en la cabecera: así un lector de pantalla sabe cómo está ordenada. */
  aria(key: K): 'ascending' | 'descending' | null {
    const sort = this.state();
    return sort.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : null;
  }

  /** La flecha de cada columna: hacia arriba o abajo en la que ordena; doble y tenue en las demás. */
  icon(key: K): string {
    const sort = this.state();
    if (sort.key !== key) {
      return 'M8 10l4-4 4 4M8 14l4 4 4-4';
    }
    return sort.dir === 1 ? 'M7 14l5-5 5 5' : 'M7 10l5 5 5-5';
  }

  /** El valor del selector de móvil. */
  value(): string {
    const sort = this.state();
    return `${sort.key}:${sort.dir}`;
  }

  set(value: string): void {
    const [key, dir] = value.split(':');
    this.state.set({ key: key as K, dir: dir === '-1' ? -1 : 1 });
  }
}
