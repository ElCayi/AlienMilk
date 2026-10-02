/**
 * Redes de AlienMilk, compartidas por el footer y la página de Contacto.
 *
 * Los iconos son trazos SVG (24×24, con contorno) para que cada componente los
 * dibuje en su propia plantilla y le apliquen sus estilos. Los trazos de `filled`
 * van rellenos. Sin `href`, el icono se muestra pero no enlaza a ningún sitio.
 */
export interface SocialLink {
  name: string;
  icon: 'instagram' | 'x' | 'linkedin';
  href?: string;
  paths: string[];
  filled?: string[];
}

export const SOCIAL_LINKS: SocialLink[] = [
  {
    name: 'Instagram',
    icon: 'instagram',
    paths: [
      'M8.5 3.5h7a5 5 0 0 1 5 5v7a5 5 0 0 1-5 5h-7a5 5 0 0 1-5-5v-7a5 5 0 0 1 5-5z',
      'M16 12a4 4 0 1 1-8 0a4 4 0 1 1 8 0z',
    ],
    filled: ['M18.3 6.8a1.1 1.1 0 1 1-2.2 0a1.1 1.1 0 1 1 2.2 0z'],
  },
  {
    name: 'X (Twitter)',
    icon: 'x',
    paths: ['M4.5 4.5h4l11 15h-4z', 'M19.5 4.5 13.4 11.4M4.5 19.5l6.1-6.9'],
  },
  {
    name: 'LinkedIn',
    icon: 'linkedin',
    paths: [
      'M6.5 3.5h11a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3h-11a3 3 0 0 1-3-3v-11a3 3 0 0 1 3-3z',
      'M8 10.5v6M8 7.5v.01M11.5 16.5v-6M11.5 13a2.5 2.5 0 0 1 5 0v3.5',
    ],
  },
];
