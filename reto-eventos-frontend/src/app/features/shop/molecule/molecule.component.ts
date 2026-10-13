import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

interface Drop {
  x: number;
  y: number;
  r: number;
}

/**
 * Muestra de cada producto: el cultivo de la cabecera de Nosotros (specimen-culture), reducido a su
 * forma. Una célula, el brote que se le está separando (unidos por un cuello viscoso, del filtro
 * del SVG) y un par de esporas sueltas, sobre una placa redonda. Coordenadas en 120 × 100: el
 * viewBox es de 120 × 120 y el cultivo baja 10 para quedar en el centro de la placa. El brote se
 * aleja y vuelve (dx, dy), así el cuello se estira y se encoge.
 */
interface Molecule {
  cell: Drop;
  bud: Drop & { dx: number; dy: number; period: number };
  spores: readonly Drop[];
}

const SHAPES: readonly Molecule[] = [
  {
    cell: { x: 46, y: 56, r: 29 },
    bud: { x: 83, y: 33, r: 16, dx: 4, dy: -3, period: 7 },
    spores: [
      { x: 104, y: 70, r: 5 },
      { x: 22, y: 30, r: 3.5 },
    ],
  },
  {
    cell: { x: 66, y: 58, r: 28 },
    bud: { x: 31, y: 33, r: 15, dx: -4, dy: -3, period: 8.5 },
    spores: [
      { x: 103, y: 26, r: 4.5 },
      { x: 22, y: 82, r: 3.5 },
    ],
  },
  {
    cell: { x: 50, y: 44, r: 27 },
    bud: { x: 85, y: 70, r: 16, dx: 4, dy: 3, period: 7.8 },
    spores: [
      { x: 22, y: 78, r: 4.5 },
      { x: 98, y: 24, r: 3.5 },
    ],
  },
];

/**
 * Las tres formas y sus reflejos (0 tal cual, 1 en horizontal, 2 en vertical, 3 en los dos): doce
 * disposiciones. Se reflejan las coordenadas y no el dibujo, así la sombra y el reflejo de la luz
 * siguen del mismo lado.
 */
const VARIANTS: readonly Molecule[] = [0, 1, 2, 3].flatMap((mirror) =>
  SHAPES.map((shape) => reflect(shape, mirror & 1 ? -1 : 1, mirror & 2 ? -1 : 1)),
);

/**
 * Una disposición fija por producto, la misma en la portada, la tienda y la ficha. El liquen, el
 * kéfir y la copa conservan las de la selección de Distribution; las demás se reparten para que en
 * el catálogo no queden dos iguales juntas.
 */
const BY_SLUG: Readonly<Record<string, number>> = {
  'leche-entera-ceto-iv': 4,
  'leche-de-pelagia': 5,
  'leche-simbiotica-de-liquen': 0,
  'mantequilla-cultivada': 8,
  'queso-de-cueva-de-gliese': 3,
  'kefir-de-tau-ceti': 1,
  'copa-de-degustacion': 2,
  'estuche-isotermico': 10,
  'catalogo-de-procedencias': 6,
};

function reflect(shape: Molecule, sx: number, sy: number): Molecule {
  const drop = ({ x, y, r }: Drop): Drop => ({
    x: sx < 0 ? 120 - x : x,
    y: sy < 0 ? 100 - y : y,
    r,
  });
  return {
    cell: drop(shape.cell),
    bud: { ...shape.bud, ...drop(shape.bud), dx: shape.bud.dx * sx, dy: shape.bud.dy * sy },
    spores: shape.spores.map(drop),
  };
}

/** Un producto nuevo, sin disposición asignada: una fija, sacada de su slug. */
function variantFor(slug: string): number {
  if (slug in BY_SLUG) {
    return BY_SLUG[slug];
  }
  let hash = 0;
  for (const char of slug) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash % VARIANTS.length;
}

/** Cada muestra necesita sus propios id de degradado y filtro dentro de la página. */
let nextId = 0;

/**
 * La muestra del producto en forma de cultivo, con su tono (data-tone en un antepasado, ver
 * shop-shared.css). Sobre papel por defecto; sobre tinta, el contenedor cambia las variables
 * --molecule-plate-fill, --molecule-plate-stroke, --molecule-shadow y --molecule-shadow-opacity.
 */
@Component({
  selector: 'app-molecule',
  standalone: true,
  templateUrl: './molecule.component.html',
  styleUrl: './molecule.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
})
export class MoleculeComponent {
  /** El slug del producto: decide la disposición. */
  readonly slug = input.required<string>();

  protected readonly id = `molecule-${++nextId}`;
  protected readonly molecule = computed(() => VARIANTS[variantFor(this.slug())]);
}
