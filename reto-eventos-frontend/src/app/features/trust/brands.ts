/** Quienes confían en AlienMilk: proveedores, hostelería y organismos de varios sistemas. Cada uno
 *  con su propio rótulo, como los logotipos de una cinta de marcas, y su emblema a una tinta (la
 *  portada dibuja los dos; Nosotros, solo el rótulo). La lista la sirve el backend
 *  (/api/red-de-confianza); la de aquí es la de reserva, mientras llega o si no responde. */
export type BrandStyle = 'serif' | 'condensed' | 'wide' | 'italic';

export interface Brand {
  name: string;
  style: BrandStyle;
  /** Clave del emblema en BRAND_MARKS: el backend solo dice cuál lleva cada socio. */
  emblem: string;
}

/** Los emblemas, en trazo, sobre una caja de 24 × 24: gotas, burbujas, órbitas y filamentos. */
export const BRAND_MARKS: Readonly<Record<string, string>> = {
  // Una gota con una burbuja.
  gota: 'M12 3.2C9.2 7 6.5 10.4 6.5 14a5.5 5.5 0 0 0 11 0c0-3.6-2.7-7-5.5-10.8ZM9 15a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0-2.4 0',
  // Una campana de servicio.
  campana:
    'M3.5 17.5h17M5.5 17.5a6.5 6.5 0 0 1 13 0M10.9 9.6a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0-2.2 0M8.5 20.5h7',
  // Un globo con su meridiano.
  globo:
    'M3.5 12a8.5 8.5 0 1 0 17 0a8.5 8.5 0 1 0-17 0M8.4 12a3.6 8.5 0 1 0 7.2 0a3.6 8.5 0 1 0-7.2 0M3.5 12h17',
  // Un planeta con anillo.
  planeta:
    'M7.4 12a4.6 4.6 0 1 0 9.2 0a4.6 4.6 0 1 0-9.2 0M2.6 15.4A10 3 -20 0 1 21.4 8.6A10 3 -20 0 1 2.6 15.4',
  // Un sistema de tres estrellas.
  estrellas:
    'M3.5 12a8.5 8.5 0 1 0 17 0a8.5 8.5 0 1 0-17 0M10.5 8.2a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0M7.2 14a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0M13.8 14a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0',
  // Un cometa.
  cometa:
    'M13.5 7.5a3 3 0 1 0 6 0a3 3 0 1 0-6 0M14.2 9.7 4 19.5M13.3 8.3 3.5 14M15.7 10.4 9.5 20.5',
  // Un hogar con su llama.
  hogar:
    'M5.5 20.5V11a6.5 6.5 0 0 1 13 0v9.5M3.5 20.5h17M12 18.5c-1.7 0-2.8-1.1-2.8-2.6 0-1.7 1.5-2.5 2.8-4.7 1.3 2.2 2.8 3 2.8 4.7 0 1.5-1.1 2.6-2.8 2.6Z',
  // Una espiral.
  espiral:
    'M11.25 12.75a1.5 1.5 0 0 1 1.5 1.5a3 3 0 0 1-3 3a4.5 4.5 0 0 1-4.5-4.5a6 6 0 0 1 6-6a7.5 7.5 0 0 1 7.5 7.5',
  // Una copa de cata, con su nivel.
  copa: 'M8 3.5h8l-.4 5.3a3.6 3.6 0 0 1-7.2 0ZM8.3 6.5h7.4M12 12.4v7.1M8.6 19.5h6.8',
  // Un cristal de hielo.
  cristal:
    'M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.8 4.6 12 6.4l2.2-1.8M9.8 19.4 12 17.6l2.2 1.8',
};

/** El emblema de un socio; si el backend trae una clave que aún no está aquí, la gota. */
export function brandMark(brand: Brand): string {
  return BRAND_MARKS[brand.emblem] ?? BRAND_MARKS['gota'];
}

export const BRANDS: readonly Brand[] = [
  { name: 'Cooperativa Láctea de Ceto IV', style: 'serif', emblem: 'gota' },
  { name: 'Hostelería Orbital', style: 'condensed', emblem: 'campana' },
  { name: 'Grupo Meridiana', style: 'wide', emblem: 'globo' },
  { name: 'Ultramarinos Kepler', style: 'italic', emblem: 'planeta' },
  { name: 'Fundación Proxima', style: 'serif', emblem: 'estrellas' },
  { name: 'Transportes Halley', style: 'condensed', emblem: 'cometa' },
  { name: 'Casa Vesta', style: 'wide', emblem: 'hogar' },
  { name: 'Mesón Andrómeda', style: 'italic', emblem: 'espiral' },
  { name: 'Federación de Catadores de Tau Ceti', style: 'serif', emblem: 'copa' },
  { name: 'Frío Gliese', style: 'condensed', emblem: 'cristal' },
];
