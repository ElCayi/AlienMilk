import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';

import { environment } from '../../../environments/environment';
import { RedConfianza } from '../../models/api.models';
import { Brand, BRANDS, BrandStyle } from './brands';

export interface TrustAward {
  code: string;
  name: string;
  issuer: string;
  date: string;
}

/** Las distinciones de reserva, mientras llegan las del backend o si no responde. */
export const TRUST_AWARDS: readonly TrustAward[] = [
  {
    code: 'CCSL',
    name: 'Distinción de Custodia Continuada',
    issuer: 'Consejo de Custodia de los Sistemas Locales',
    date: 'Renovada desde 1962',
  },
  {
    code: 'CEE',
    name: 'Premio al Descubrimiento de Nuevas Formas de Entretenimiento Exótico',
    issuer: 'Círculo de Experiencias Extraordinarias',
    date: '1849',
  },
  {
    code: 'CSH',
    name: 'Mención a la Hospitalidad Interespecie',
    issuer: 'Consejo de Salones y Hospedajes',
    date: '1897',
  },
  {
    code: 'CMR',
    name: 'Certificación de Custodia de Información · Grado Militar',
    issuer: 'Cámara de Resiliencia y Seguridad',
    date: '1934',
  },
  {
    code: 'FEN',
    name: 'Premio a la Innovación Sensorial Aplicada',
    issuer: 'Foro de Experiencias No Convencionales',
    date: '1968',
  },
  {
    code: 'AFC',
    name: 'Miembro honorífico Furrfestigal',
    issuer: 'Aso. FurriCompostela',
    date: '1991',
  },
  {
    code: 'CEA',
    name: 'Top Circuito de Experiencias para Adultos',
    issuer: 'Confederación de Espacios Alternativos',
    date: '2014',
  },
  {
    code: 'SWX',
    name: 'Mención Especial en Programación Swinger Interespecie',
    issuer: 'Salón SWX',
    date: '2021',
  },
  {
    code: 'VANTA',
    name: 'OnlyMilk',
    issuer: 'VANTA Alta Intensidad Sensorial',
    date: '2025',
  },
];

export interface TrustFigure {
  label: string;
  value: string;
  unit: string | null;
  note: string | null;
}

/** Las cifras de reserva, las de JT, mientras llegan las del backend o si no responde. */
export const TRUST_FIGURES: readonly TrustFigure[] = [
  { label: 'Continuidad', value: '217', unit: 'años', note: 'Sin interrupción operativa' },
  { label: 'Cobertura', value: '83', unit: 'sistemas', note: '3 regiones galácticas' },
  { label: 'Linajes custodiados', value: '18.642', unit: null, note: 'Y creciendo' },
  { label: 'Filtraciones de origen', value: '0', unit: null, note: 'En más de dos siglos' },
];

const STYLES: readonly BrandStyle[] = ['serif', 'condensed', 'wide', 'italic'];

/**
 * La red de confianza de la portada: distinciones, socios y cifras, del backend. Mientras llegan, o si falla, se
 * quedan los de reserva, así la sección nunca sale vacía. Se pide una vez.
 */
@Injectable({ providedIn: 'root' })
export class TrustNetworkService {
  private readonly http = inject(HttpClient);

  readonly awards = signal<readonly TrustAward[]>(TRUST_AWARDS);
  readonly brands = signal<readonly Brand[]>(BRANDS);
  readonly figures = signal<readonly TrustFigure[]>(TRUST_FIGURES);

  private requested = false;

  load(): void {
    if (this.requested) {
      return;
    }
    this.requested = true;
    this.http.get<RedConfianza>(`${environment.apiUrl}/red-de-confianza`).subscribe({
      next: ({ premios, socios, cifras }) => {
        if (premios?.length) {
          this.awards.set(
            premios.map((premio) => ({
              code: premio.sigla,
              name: premio.nombre,
              issuer: premio.otorgante,
              date: premio.fecha,
            })),
          );
        }
        if (socios.length) {
          this.brands.set(
            socios.map((socio) => ({
              name: socio.nombre,
              style: STYLES.includes(socio.estilo as BrandStyle)
                ? (socio.estilo as BrandStyle)
                : 'serif',
              emblem: socio.emblema,
            })),
          );
        }
        if (cifras.length) {
          this.figures.set(
            cifras.map((cifra) => ({
              label: cifra.rotulo,
              value: cifra.valor,
              unit: cifra.unidad,
              note: cifra.nota,
            })),
          );
        }
      },
      // Sin backend, la sección se queda con los de reserva.
      error: () => (this.requested = false),
    });
  }
}
