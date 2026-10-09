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
  /** El texto que se despliega con el (+) de la destacada. */
  detail?: string;
}

/** Las distinciones de reserva, mientras llegan las del backend o si no responde. */
export const TRUST_AWARDS: readonly TrustAward[] = [
  {
    code: 'CCSL',
    name: 'Distinción de Custodia Continuada',
    issuer: 'Consejo de Custodia de los Sistemas Locales',
    date: 'Renovada desde 1962',
    detail:
      'Se concede a quien custodia sin interrupción muestras de origen no declarado. AlienMilk la recibió en 1962 y la ha renovado en cada auditoría desde entonces: en todo este tiempo, el Consejo no ha encontrado una cámara abierta ni un registro incompleto.',
  },
  {
    code: 'CATL',
    name: 'Premio al Entretenimiento Exótico',
    issuer: 'Confederación para el Avance del Tiempo Libre',
    date: '1849',
    detail:
      'Concedido a AlienMilk por convertir la exploración láctea en una categoría propia de experiencia recreativa. La Confederación destacó su capacidad para combinar descubrimiento, degustación y participación pública en un formato «suficientemente extraño para necesitar nombre propio».',
  },
  {
    code: 'CSH',
    name: 'Mención a la Hospitalidad Interespecie',
    issuer: 'Consejo de Salones y Hospedajes',
    date: '1897',
    detail:
      'Reconoce la labor de AlienMilk en la creación de espacios donde personas de distintas procedencias, culturas y naturalezas comparten actividades en igualdad de condiciones. El Consejo destacó especialmente su capacidad para convertir esa diversidad en parte de la experiencia, favoreciendo el intercambio y el entendimiento entre comunidades que rara vez coinciden en un mismo lugar.',
  },
  {
    code: 'CMR',
    name: 'Certificación de Resiliencia Informacional · Grado Militar',
    issuer: 'Cámara de Resiliencia y Seguridad',
    date: '1934',
    detail:
      'Concedida tras someter la infraestructura de AlienMilk a pruebas de intrusión, pérdida de instalaciones, compromiso interno simulado y degradación deliberada de sus sistemas. La Cámara concluyó que obtener información protegida requeriría más recursos de los que razonablemente justificaría conocerla. El informe público ocupa tres líneas. El resto permanece clasificado.',
  },
  {
    code: 'FEN',
    name: 'Premio a la Innovación Sensorial Aplicada',
    issuer: 'Foro de Experiencias No Convencionales',
    date: '1968',
    detail:
      'Premia el uso de la textura, la temperatura y el silencio como ingredientes. El jurado del Foro probó la sesión a ciegas y pidió repetirla con los ojos abiertos, por si acaso.',
  },
  {
    code: 'AFC',
    name: 'Miembro honorífico Furrfestigal',
    issuer: 'Aso. FurriCompostela',
    date: '1991',
    detail:
      'La Asociación FurriCompostela nombró a AlienMilk miembro honorífico tras varias ediciones del Furrfestigal sirviendo leche templada a asistentes de todos los pelajes. El carné no caduca.',
  },
  {
    code: 'GV',
    name: 'Colección de Orígenes Remotos',
    issuer: 'Galerías Vesta',
    date: '2014',
    detail:
      'Primer acuerdo de distribución minorista de AlienMilk para una colección de leches seleccionadas por su interés gastronómico. La campaña introdujo sabores, texturas y propiedades culinarias desconocidas para buena parte del público de Vesta. Tres referencias permanecieron en catálogo después de que la edición limitada dejara de ser limitada.',
  },
  {
    code: 'SWX',
    name: 'Mención Especial en Programación Swinger',
    issuer: 'Salón SWX',
    date: '2021',
    detail:
      'Reconoce la capacidad de AlienMilk para integrar juego corporal, texturas, aromas, temperatura, brillo y puesta en escena dentro de experiencias swinger para públicos diversos. El jurado destacó especialmente aquellas sesiones en las que la leche dejó de ser algo que se sirve en una copa y pasó a formar parte del espacio, de los cuerpos y del juego. El Salón SWX subrayó además su uso de baños, látex, iluminación y contacto corporal para crear experiencias sensoriales únicas.',
  },
  {
    code: 'OF',
    name: 'Club del Millón · OnlyMilk',
    issuer: 'OnlyFans',
    date: '2025',
    detail:
      'Reconocimiento concedido tras superar el millón de suscripciones activas en OnlyMilk. La plataforma destacó la producción regular de contenido exclusivo, las retransmisiones de sesiones y una comunidad particularmente participativa. AlienMilk sostiene que la mayoría está allí por razones estrictamente lácteas.',
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
              detail: premio.descripcion ?? TRUST_AWARDS.find((award) => award.code === premio.sigla)?.detail,
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
