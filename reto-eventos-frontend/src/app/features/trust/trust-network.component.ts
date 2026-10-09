import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';

import { FitLineDirective } from '../../shared/fit-line/fit-line.directive';
import { brandMark } from './brands';
import { TrustAward, TrustNetworkService } from './trust-network.service';

/**
 * Portada: la red de confianza, entre Collaborators y el cierre, con el formato de las demás secciones.
 * Las distinciones de la casa, quienes trabajan con AlienMilk, en una cinta que avanza sola, y la
 * trayectoria en cuatro cifras, todo del backend; luego, las experiencias sin firma y la discreción.
 */
@Component({
  selector: 'app-trust-network',
  standalone: true,
  imports: [FitLineDirective],
  templateUrl: './trust-network.component.html',
  styleUrls: ['./trust-network.component.css', './trust-privacy.css'],
  // El fondo de la portada pinta de blanco este elemento (ver liquid-backdrop.component.ts).
  host: { 'data-backdrop-block': '' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrustNetworkComponent implements OnInit {
  private readonly trust = inject(TrustNetworkService);
  private readonly destroyRef = inject(DestroyRef);

  /** La sigla de la distinción elegida en el palmarés; sin elegir, la primera (la de Custodia
   *  Continuada). */
  private readonly selectedCode = signal<string | null>(null);
  /** La destacada, con su medalla: la elegida en el palmarés. */
  protected readonly featuredAward = computed(() => {
    const awards = this.trust.awards();
    return awards.find((award) => award.code === this.selectedCode()) ?? awards[0] ?? null;
  });
  /** El palmarés: todas, de la más antigua a la más reciente, para poder volver a cualquiera. */
  protected readonly palmares = computed(() =>
    [...this.trust.awards()].sort((a, b) => awardYear(a) - awardYear(b)),
  );
  /** La fecha de la destacada: la suya si es una frase («Renovada desde 1962»); si es solo el año,
   *  «Vigente desde» y el año. */
  protected readonly featuredDate = computed(() => {
    const date = this.featuredAward()?.date ?? '';
    return /^\d{4}$/.test(date) ? `Vigente desde ${date}` : date;
  });
  /** Hasta que carga la fuente, las medidas del nombre no valen. */
  private readonly fontsReady = signal(false);
  /** El cuerpo del nombre en la destacada: el mayor que lo deja en dos líneas; si ni el mediano
   *  basta, el pequeño, en tres. */
  protected readonly featuredNameSize = computed(() => {
    this.fontsReady();
    const name = this.featuredAward()?.name ?? '';
    if (nameLines(name, 1) <= 2) {
      return 'short';
    }
    return nameLines(name, 0.78) <= 2 ? 'medium' : 'long';
  });
  /** La leyenda que gira dentro de la medalla: la sigla y el año, «CCSL.1962», repetidos hasta dar la
   *  vuelta (menos veces cuanto más larga). */
  protected readonly medalLegend = computed(() => {
    const award = this.featuredAward();
    if (!award) {
      return '';
    }
    const year = award.date.match(/\d{4}/)?.[0];
    // Con espacios duros: el último, al final de la vuelta, no se pierde y la junta no se nota.
    const unit = `${award.code}${year ? '.' + year : ''}\u00a0·\u00a0`;
    return unit.repeat(Math.max(2, Math.round(60 / unit.length)));
  });
  protected readonly brands = this.trust.brands;
  protected readonly figures = this.trust.figures;
  protected readonly brandMark = brandMark;

  protected readonly awardYear = awardYear;
  protected readonly twoDigits = twoDigits;

  /** La síntesis de la destacada, desplegada con su (+). Sigue abierto al cambiar de
   *  distinción. */
  protected readonly detailOpen = signal(false);

  /** Las experiencias, en un carrusel por páginas. */
  protected readonly voices = VOICES;
  private readonly voicesList = viewChild<ElementRef<HTMLUListElement>>('voicesList');
  /** Cuántas páginas hay y en cuál está, según el ancho (tres por página o una). */
  protected readonly voicePages = signal(Math.ceil(VOICES.length / 3));
  protected readonly voicePage = signal(0);
  /** La página pasa sola cuando se llena la raya del contador; se para con el cursor encima, con el
   *  foco del teclado dentro, al arrastrar, fuera de la vista o con la pestaña oculta. */
  protected readonly voicesHover = signal(false);
  protected readonly voicesFocus = signal(false);
  protected readonly dragging = signal(false);
  private readonly voicesSeen = signal(false);
  private readonly pageHidden = signal(false);
  protected readonly voicesPaused = computed(
    () => this.voicesHover() || this.voicesFocus() || this.dragging() || !this.voicesSeen() || this.pageHidden(),
  );

  constructor() {
    afterNextRender(() => {
      const list = this.voicesList()?.nativeElement;
      if (!list) {
        return;
      }
      const measure = () => {
        const perPage = Number(getComputedStyle(list).getPropertyValue('--voices-per-page')) || 1;
        this.voicePages.set(Math.ceil(this.voices.length / perPage));
        this.onVoicesScroll();
      };
      const resize = new ResizeObserver(measure);
      resize.observe(list);
      const seen = new IntersectionObserver(([entry]) => this.voicesSeen.set(entry.isIntersecting));
      seen.observe(list);
      const visibility = () => this.pageHidden.set(document.hidden);
      document.addEventListener('visibilitychange', visibility);
      // Con el dedo o el touchpad, el navegador desliza página a página, pero se para en los
      // extremos: un gesto nuevo que empuja más allá de la última página vuelve a la primera (y antes
      // de la primera, a la última).
      const edgeOf = () =>
        list.scrollLeft >= list.scrollWidth - list.clientWidth - 2 ? 1 : list.scrollLeft <= 2 ? -1 : 0;
      const wrapFrom = (edge: number) => this.goToVoicePage(edge > 0 ? 0 : this.voicePages() - 1);
      let touch = { x: 0, edge: 0 };
      const touchStart = (event: TouchEvent) => (touch = { x: event.touches[0].clientX, edge: edgeOf() });
      const touchEnd = (event: TouchEvent) => {
        const pushed = touch.x - event.changedTouches[0].clientX;
        if (touch.edge && Math.abs(pushed) > 60 && Math.sign(pushed) === touch.edge) {
          wrapFrom(touch.edge);
        }
      };
      // Un gesto de touchpad es una racha de eventos de rueda; tras una pausa empieza otro, y solo
      // cuenta si empieza ya en el extremo (si no, el mismo gesto que llega al final daría la vuelta).
      let wheel = { at: -Infinity, edge: 0, pushed: 0 };
      const onWheel = (event: WheelEvent) => {
        if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) {
          return;
        }
        if (event.timeStamp - wheel.at > 300) {
          wheel = { at: 0, edge: edgeOf(), pushed: 0 };
        }
        wheel.at = event.timeStamp;
        if (wheel.edge && Math.sign(event.deltaX) === wheel.edge) {
          wheel.pushed += Math.abs(event.deltaX);
          if (wheel.pushed > 40) {
            wrapFrom(wheel.edge);
            wheel.edge = 0;
          }
        }
      };
      list.addEventListener('touchstart', touchStart, { passive: true });
      list.addEventListener('touchend', touchEnd, { passive: true });
      list.addEventListener('wheel', onWheel, { passive: true });
      this.destroyRef.onDestroy(() => {
        resize.disconnect();
        seen.disconnect();
        document.removeEventListener('visibilitychange', visibility);
        list.removeEventListener('touchstart', touchStart);
        list.removeEventListener('touchend', touchEnd);
        list.removeEventListener('wheel', onWheel);
      });
    });
  }

  ngOnInit(): void {
    this.trust.load();
    globalThis.document?.fonts?.ready.then(() => this.fontsReady.set(true));
  }

  protected select(award: TrustAward): void {
    this.selectedCode.set(award.code);
  }

  protected toggleDetail(): void {
    this.detailOpen.update((open) => !open);
  }

  protected goToVoicePage(page: number): void {
    const list = this.voicesList()?.nativeElement;
    if (!list) {
      return;
    }
    const still = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    list.scrollTo({ left: page * pageWidth(list), behavior: still ? 'auto' : 'smooth' });
  }

  /** Las flechas: la página anterior o la siguiente, dando la vuelta en los extremos. */
  protected stepVoicePage(step: number): void {
    this.goToVoicePage(wrapPage(this.voicePage() + step, this.voicePages()));
  }

  /** Llena la raya del contador: pasa a la página siguiente. */
  protected onVoicesProgressEnd(): void {
    this.stepVoicePage(1);
  }

  /** Solo el foco del teclado lo para: un clic en una flecha también deja el foco, y entonces no
   *  volvería a pasar solo hasta pulsar en otra parte. */
  protected onVoicesFocus(event: FocusEvent): void {
    this.voicesFocus.set((event.target as Element).matches(':focus-visible'));
  }

  protected onVoicesScroll(): void {
    const list = this.voicesList()?.nativeElement;
    if (list) {
      this.voicePage.set(Math.min(this.voicePages() - 1, Math.round(list.scrollLeft / pageWidth(list))));
    }
  }

  /** Con el ratón, el carrusel se arrastra desde cualquier punto, también sobre el texto (que así no
   *  se selecciona arrastrando; con doble clic, sí); al soltar, va a la página siguiente o a la
   *  anterior si se ha movido lo bastante (dando la vuelta en los extremos), y si no, vuelve a la
   *  suya. Con el dedo o el touchpad, lo desliza el navegador. */
  protected onVoicesPointerDown(event: PointerEvent): void {
    const list = this.voicesList()?.nativeElement;
    if (!list || event.pointerType !== 'mouse' || event.button !== 0) {
      return;
    }
    const startX = event.clientX;
    const startLeft = list.scrollLeft;
    const startPage = this.voicePage();
    let moved = 0;
    const move = (e: PointerEvent) => {
      moved = e.clientX - startX;
      if (!this.dragging() && Math.abs(moved) > 4) {
        // Arrastrar no selecciona texto: se suelta lo que haya empezado a seleccionar el clic.
        getSelection()?.removeAllRanges();
        this.dragging.set(true);
      }
      if (this.dragging()) {
        list.scrollLeft = startLeft - moved;
      }
    };
    const up = () => {
      removeEventListener('pointermove', move);
      removeEventListener('pointerup', up);
      if (!this.dragging()) {
        return;
      }
      const step = Math.abs(moved) > 60 ? -Math.sign(moved) : 0;
      this.dragging.set(false);
      this.goToVoicePage(wrapPage(startPage + step, this.voicePages()));
    };
    addEventListener('pointermove', move);
    addEventListener('pointerup', up);
  }
}

/** La página, dando la vuelta: tras la última, la primera, y antes de la primera, la última. */
function wrapPage(page: number, pages: number): number {
  return (page + pages) % pages;
}

/** El ancho de una página del carrusel: el de su contenido (sin el margen que deja colgar las
 *  comillas) más el hueco entre citas. */
function pageWidth(list: HTMLElement): number {
  const style = getComputedStyle(list);
  const padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
  return list.clientWidth - padding + (parseFloat(style.columnGap) || 0);
}

/** Las experiencias sin firma, mezcladas las breves y las largas: la cita, quién la cuenta (sin
 *  número, si se retiró: sale tachado) y dónde. */
const VOICES: readonly { quote: string; role: string; number?: string; place: string }[] = [
  {
    quote:
      'Olía a bosque mojado. El técnico aseguró que procedía de un organismo de un planeta sin árboles, sin lluvia y sin pulmones.',
    role: 'Comensal',
    number: '3812',
    place: 'Sesión 0441',
  },
  {
    quote: 'No sabría decir a qué sabía. Sé que he vuelto cuatro veces.',
    role: 'Comensal',
    number: '4471',
    place: 'Sesión 0212',
  },
  {
    quote: 'Nos pidieron que no tocáramos la superficie. Al cabo de un rato, empezó a tocarnos ella.',
    role: 'Participante',
    number: '0806',
    place: 'Cámara de Inmersión',
  },
  {
    quote:
      'Entré con mi marido. Salimos con invitaciones distintas para la siguiente sesión. Hemos aceptado las dos.',
    role: 'Comensal',
    number: '2719',
    place: 'Sesión privada 0083',
  },
  { quote: 'Mi médico pregunta. Yo no.', role: 'Comensal', place: 'Datos retirados' },
  {
    quote:
      'Viajé tres sistemas para conocer a la criatura que producía aquella leche. Se acercó a mí y apoyó algo parecido a una mejilla contra el cristal. Lloré como una idiota.',
    role: 'Colaboradora',
    number: '1148',
    place: 'Expedición 0316',
  },
  {
    quote: 'Pedí la receta. Me dieron un número de expediente.',
    role: 'Comensal',
    number: '3312',
    place: 'Sesión 0127',
  },
  {
    quote:
      'El baño duró once minutos. A la salida tardé casi una hora en convencer a mis piernas de que el suelo seguía siendo sólido.',
    role: 'Participante',
    number: '0143',
    place: 'Estación Pelagia',
  },
  {
    quote: 'Sabía a leche. Luego, a algo que todavía no tiene nombre.',
    role: 'Comensal',
    number: '5590',
    place: 'Sesión 0288',
  },
  {
    quote:
      'La primera vez fui con una amiga. La segunda, con tres desconocidos. De la tercera prefiero conservar las fotografías en privado.',
    role: 'Participante',
    number: '6620',
    place: 'Ciclo de Contacto',
  },
  {
    quote: 'Cuatro estrellas. La quinta la vi desde la mesa.',
    role: 'Comensal',
    number: '0412',
    place: 'Sesión 0305',
  },
  {
    quote:
      'En la visita nos dejaron dormir junto al lugar de recolección. A las cuatro de la mañana, el suelo empezó a ronronear. Nadie quiso cambiar de habitación.',
    role: 'Colaborador',
    number: '3911',
    place: 'Expedición 0227',
  },
  {
    quote: 'Me pidieron que no describiera la textura. Puedo decir que la hubo.',
    role: 'Comensal',
    number: '0098',
    place: 'Estación Pelagia',
  },
  {
    quote: 'Pedí otra copa. El camarero miró primero al recipiente, esperó unos segundos y luego me dijo que sí.',
    role: 'Comensal',
    number: '5073',
    place: 'Sesión 0298',
  },
  {
    quote: 'Mi pareja dice que desde entonces hablo en sueños. En otro idioma.',
    role: 'Comensal',
    number: '2209',
    place: 'Sesión 0391',
  },
  {
    quote:
      'Al salir, alguien me preguntó a qué sabía. No encontré las palabras. Tuve que ponerle la mano en la nuca para explicárselo.',
    role: 'Comensal',
    number: '0091',
    place: 'Sesión 0512',
  },
  {
    quote: 'No firmé nada. Aun así, sé que no debo contarlo.',
    role: 'Comensal',
    number: '0007',
    place: 'Estación Pelagia',
  },
  {
    quote: 'Llegué por curiosidad. Me quedé por la tercera copa.',
    role: 'Comensal',
    number: '1187',
    place: 'Sesión 0340',
  },
];



/** Ancho de la columna del nombre, en cuerpos del nombre corto (ver .trust-award-copy). */
const NAME_MEASURE_EM = 7.6;
let nameCanvas: CanvasRenderingContext2D | null | undefined;

/** Cuántas líneas ocupa el nombre a ese cuerpo (1 = el corto), repartiendo las palabras como el
 *  navegador, con la medida real de la Barlow Condensed y su espaciado (0,01em). Como la columna y
 *  la letra crecen a la vez, la cuenta vale para cualquier ancho; en móvil la columna es más ancha. */
function nameLines(name: string, scale: number): number {
  nameCanvas ??= globalThis.document?.createElement('canvas').getContext('2d') ?? null;
  if (!nameCanvas) {
    return Math.ceil((name.length * 0.42 * scale) / NAME_MEASURE_EM);
  }
  nameCanvas.font = "400 100px 'Barlow Condensed', 'Arial Narrow', sans-serif";
  const width = (text: string) => (nameCanvas!.measureText(text).width / 100 + text.length * 0.01) * scale;
  let lines = 1;
  let line = '';
  for (const word of name.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (line && width(next) > NAME_MEASURE_EM) {
      lines++;
      line = word;
    } else {
      line = next;
    }
  }
  return lines;
}

/** Un número con dos cifras, como los códigos de la casa: «02». */
function twoDigits(value: number): string {
  return String(value).padStart(2, '0');
}

/** El año de una distinción, esté solo o en una frase. */
function awardYear(award: TrustAward): number {
  return Number(award.date.match(/\d{4}/)?.[0] ?? 0);
}
