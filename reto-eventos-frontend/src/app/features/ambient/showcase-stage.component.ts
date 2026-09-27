import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  Input,
  signal,
  ViewEncapsulation,
} from '@angular/core';

const STAGE_QUERY =
  '(min-width: 1001px) and (min-height: 640px) and (prefers-reduced-motion: no-preference)';

/** Pliegues por mitades que reducen el recorte a una tarjeta: vertical, horizontal y otra vez. */
const FOLDS = 4;
/** Tramo de cada transición que ocupa plegar la sala de salida (el mismo para desplegar la otra). */
const FOLD_SPAN = 0.44;

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const ease = (value: number) => value * value * (3 - 2 * value);
const span = (value: number, from: number, to: number) => ease(clamp((value - from) / (to - from)));

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Escenario de la portada: las secciones que comparten escaparate se exponen en un solo recorte
 * fijo sobre la mesa y el scroll las pliega unas en otras como papel. El recorte de la sala de
 * salida se dobla por la mitad cuatro veces, como un mapa, hasta quedar en una tarjeta; la tarjeta
 * se levanta y da una vuelta, y al desplegarse ya es la sala siguiente. Al terminar, las marcas de
 * los pliegues se quedan un momento en el papel.
 *
 * El índice de arriba son pestañas de expediente: la de la sala en curso despliega su cabecera
 * (la entradilla de cada sección), que se abre sola la primera vez que se llega y se recoge al
 * volver a hacer scroll. Con pantallas pequeñas, poca altura o «reducir movimiento» las secciones
 * vuelven al flujo normal de la página.
 */
@Component({
  selector: 'app-showcase-stage',
  standalone: true,
  template: `
    <div class="showcase-stage-pin">
      <nav class="showcase-rail" aria-label="Secciones de la portada">
        <span class="showcase-rail-track" aria-hidden="true">
          <span class="showcase-rail-milk"></span>
        </span>
        <ol>
          @for (chapter of chapters; track chapter; let index = $index) {
            <li>
              <button
                type="button"
                [class.is-active]="index === current()"
                [class.is-open]="index === open()"
                [attr.aria-current]="index === current() ? 'step' : null"
                [attr.aria-expanded]="index === current() ? index === open() : null"
                (click)="select(index)"
              >
                <span class="showcase-rail-number">0{{ index + 1 }}</span>
                <span class="showcase-rail-label">{{ chapter }}</span>
                <span class="showcase-rail-toggle" aria-hidden="true"></span>
              </button>
            </li>
          }
        </ol>
      </nav>
      <div class="showcase-stage-stack">
        <div class="showcase-stage-table" aria-hidden="true"></div>
        <ng-content />
      </div>
      <div class="showcase-fold" aria-hidden="true" inert>
        <div class="showcase-fold-packet">
          <div class="showcase-fold-piece showcase-fold-base">
            <span class="showcase-fold-shade"></span>
          </div>
          <div class="showcase-fold-flap">
            <div class="showcase-fold-piece showcase-fold-front">
              <span class="showcase-fold-shade"></span>
            </div>
            <div class="showcase-fold-piece showcase-fold-back"></div>
          </div>
        </div>
      </div>
      <div class="showcase-fold-creases" aria-hidden="true"></div>
    </div>
    @for (chapter of chapters; track chapter; let index = $index) {
      <span class="showcase-stage-rest" aria-hidden="true" [style.--rest]="index"></span>
    }
  `,
  styleUrl: './showcase-stage.component.css',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.--stage-rests]': 'chapters.length - 1',
    '[style.--stage-tabs]': 'chapters.length',
    '(document:keydown.escape)': 'close()',
  },
})
export class ShowcaseStageComponent {
  /** Nombre de cada sección, en el orden en que se proyectan. */
  @Input({ required: true }) chapters: readonly string[] = [];

  readonly current = signal(0);
  readonly open = signal<number | null>(null);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private sections: HTMLElement[] = [];
  private readonly briefed = new Set<number>();
  private staged = false;
  private position = 0;
  private frame = 0;
  private briefTimer = 0;
  /** Copias impresas de cada sala para las dos caras que se doblan: [izquierda, derecha]. */
  private readonly sheets = new Map<number, [HTMLElement, HTMLElement]>();
  private foldingFrom: number | null = null;
  private sheetsShown: number | null = null;

  constructor() {
    afterNextRender(() => this.start());
  }

  /** La pestaña de la sala en curso despliega su expediente; las demás llevan a su sala. */
  select(index: number): void {
    if (this.staged && index === this.current()) {
      this.setOpen(this.open() === index ? null : index);
      return;
    }
    this.goTo(index);
  }

  close(): void {
    this.setOpen(null);
  }

  private goTo(index: number): void {
    const window = this.document.defaultView;
    const section = this.sections[index];
    if (!window || !section) {
      return;
    }

    if (!this.staged) {
      section.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    const { top, pinTop, travel } = this.metrics();
    const stop = travel * (index / Math.max(1, this.sections.length - 1));
    window.scrollTo({ top: window.scrollY + top - pinTop + stop, behavior: 'smooth' });
  }

  private start(): void {
    const window = this.document.defaultView;
    const root = this.host.nativeElement;
    const stack = root.querySelector('.showcase-stage-stack');
    if (!window || !stack) {
      return;
    }

    this.sections = Array.from(stack.children).filter(
      (child): child is HTMLElement =>
        child instanceof HTMLElement && !child.classList.contains('showcase-stage-table'),
    );
    this.sections.forEach((section, index) => section.style.setProperty('--tab-index', `${index}`));

    // El papel tiene algo de inercia: la posición mostrada persigue a la del scroll.
    const tick = () => {
      this.frame = 0;
      const target = this.target();
      this.position += (target - this.position) * 0.12;
      if (Math.abs(target - this.position) < 0.0005) {
        this.position = target;
      }
      this.apply(this.position);
      if (this.position !== target) {
        this.frame = window.requestAnimationFrame(tick);
      } else {
        this.settle();
      }
    };

    const wake = () => {
      if (this.staged && !this.frame) {
        this.frame = window.requestAnimationFrame(tick);
      }
    };

    // Un clic fuera de la pestaña abierta y de su expediente lo recoge.
    const outside = (event: PointerEvent) => {
      const open = this.open();
      const target = event.target as Node | null;
      if (open === null || !target) {
        return;
      }
      const drawer = this.sections[open]?.querySelector('.sessions-editorial, .locations-editorial');
      if (!drawer?.contains(target) && !root.querySelector('.showcase-rail')?.contains(target)) {
        this.close();
      }
    };

    const media = window.matchMedia(STAGE_QUERY);
    const update = () => this.setStaged(media.matches);
    update();

    media.addEventListener('change', update);
    window.addEventListener('scroll', wake, { passive: true });
    window.addEventListener('resize', wake);
    this.document.addEventListener('pointerdown', outside);

    this.destroyRef.onDestroy(() => {
      window.cancelAnimationFrame(this.frame);
      window.clearTimeout(this.briefTimer);
      media.removeEventListener('change', update);
      window.removeEventListener('scroll', wake);
      window.removeEventListener('resize', wake);
      this.document.removeEventListener('pointerdown', outside);
      this.setStaged(false);
    });
  }

  private setStaged(staged: boolean): void {
    this.staged = staged;
    this.host.nativeElement.classList.toggle('is-staged', staged);
    this.setOpen(null);
    this.dropSheets();

    if (staged) {
      this.position = this.target();
      this.apply(this.position);
      this.settle();
      return;
    }

    for (const section of this.sections) {
      section.classList.remove('is-shown', 'is-current', 'is-open');
    }
  }

  private setOpen(index: number | null): void {
    this.open.set(index);
    this.sections.forEach((section, sectionIndex) =>
      section.classList.toggle('is-open', sectionIndex === index),
    );
  }

  /**
   * Al quedarse quieto en una sala por primera vez, su expediente se despliega solo: la cabecera
   * se lee cuando la animación ha terminado, no encima de ella.
   */
  private settle(): void {
    const window = this.document.defaultView;
    window?.clearTimeout(this.briefTimer);
    const index = Math.round(this.position);
    const { top, pinTop } = this.metrics();
    const pinned = top <= pinTop + 1;
    if (!window || !pinned || this.position !== index || this.briefed.has(index)) {
      return;
    }

    this.briefTimer = window.setTimeout(() => {
      if (this.position === index) {
        this.briefed.add(index);
        this.setOpen(index);
      }
    }, 450);
  }

  private metrics() {
    const host = this.host.nativeElement;
    const pin = host.querySelector<HTMLElement>('.showcase-stage-pin');
    const pinTop = pin ? parseFloat(getComputedStyle(pin).top) || 0 : 0;
    const travel = Math.max(1, host.offsetHeight - (pin?.offsetHeight ?? 0));
    return { top: host.getBoundingClientRect().top, pinTop, travel };
  }

  /** Posición del scroll en salas: 0 es la primera; la última, la última. */
  private target(): number {
    const { top, pinTop, travel } = this.metrics();
    const position = clamp((pinTop - top) / travel) * (this.sections.length - 1);
    // Los subpíxeles del scroll no deben dejar una sala a medio plegar.
    const rest = Math.round(position);
    return Math.abs(position - rest) < 0.003 ? rest : position;
  }

  private apply(position: number): void {
    const last = this.sections.length - 1;
    const from = Math.min(Math.floor(position), Math.max(0, last - 1));
    const progress = clamp(position - from);
    const current = Math.round(position);
    const folding = progress > 0 && progress < 1;

    // Las salas de verdad solo se ven quietas; durante el pliegue las sustituyen sus copias.
    this.sections.forEach((section, index) => {
      section.classList.toggle('is-shown', !folding && index === current);
      section.classList.toggle('is-current', index === current);
    });

    if (this.open() !== null && position !== this.open()) {
      this.setOpen(null);
    }

    this.host.nativeElement
      .querySelector<HTMLElement>('.showcase-rail')
      ?.style.setProperty('--stage-progress', (position / Math.max(1, last)).toFixed(4));
    this.current.set(current);
    this.fold(folding ? from : null, progress);
  }

  /**
   * El recorte se dobla por la mitad, siempre la mitad derecha o la de abajo sobre la otra, y el
   * paquete se va desplazando para quedarse en el centro de la mesa. Solo el primer pliegue lleva
   * la sala impresa; a partir de ahí lo que se ve es el dorso del papel.
   */
  private fold(from: number | null, progress: number): void {
    const root = this.host.nativeElement;
    const rig = root.querySelector<HTMLElement>('.showcase-fold');
    const packet = root.querySelector<HTMLElement>('.showcase-fold-packet');
    const base = root.querySelector<HTMLElement>('.showcase-fold-base');
    const flap = root.querySelector<HTMLElement>('.showcase-fold-flap');
    const front = root.querySelector<HTMLElement>('.showcase-fold-front');
    const back = root.querySelector<HTMLElement>('.showcase-fold-back');
    const table = root.querySelector<HTMLElement>('.showcase-stage-table');
    const creases = root.querySelector<HTMLElement>('.showcase-fold-creases');
    if (!rig || !packet || !base || !flap || !front || !back || !table || !creases) {
      return;
    }

    if (from === null) {
      // Las marcas de los pliegues quedan en el papel recién desplegado y se borran al asentarse.
      rig.classList.remove('is-folding');
      creases.classList.add('is-fading');
      creases.style.opacity = '0';
      this.foldingFrom = null;
      return;
    }

    if (this.foldingFrom !== from) {
      // Cada transición parte de copias recientes: el carrusel o los datos pueden haber cambiado.
      this.dropSheets();
      this.foldingFrom = from;
    }
    rig.classList.add('is-folding');

    const width = table.offsetWidth;
    const height = table.offsetHeight;
    const unfolding = progress > 0.5;
    const level = unfolding
      ? FOLDS - this.foldLevel((progress - (1 - FOLD_SPAN)) / FOLD_SPAN)
      : this.foldLevel(progress / FOLD_SPAN);

    const done = Math.min(FOLDS, Math.floor(level));
    const turn = done >= FOLDS ? 0 : level - done;
    const packetWidth = width / 2 ** Math.ceil(done / 2);
    const packetHeight = height / 2 ** Math.floor(done / 2);
    const vertical = done % 2 === 0;

    // Las marcas solo se ven con el papel casi extendido: al empezar a plegar y al acabar de abrir.
    creases.classList.remove('is-fading');
    creases.style.opacity = done === 0 ? ((1 - clamp(turn / 0.2)) * 0.9).toFixed(3) : '0';

    let stay: Box = { left: 0, top: 0, width: packetWidth, height: packetHeight };
    if (done < FOLDS) {
      stay = vertical ? { ...stay, width: packetWidth / 2 } : { ...stay, height: packetHeight / 2 };
      const moving: Box = vertical
        ? { left: packetWidth / 2, top: 0, width: packetWidth / 2, height: packetHeight }
        : { left: 0, top: packetHeight / 2, width: packetWidth, height: packetHeight / 2 };
      this.place(flap, moving);
      flap.style.display = '';
      flap.style.transformOrigin = vertical ? 'left center' : 'center top';
      flap.style.transform = vertical
        ? `rotateY(${(-180 * turn).toFixed(2)}deg)`
        : `rotateX(${(180 * turn).toFixed(2)}deg)`;
      back.style.transform = vertical ? 'rotateY(180deg)' : 'rotateX(180deg)';
      front.style.setProperty('--shade', (Math.sin(Math.PI * turn) * 0.32).toFixed(3));
      base.style.setProperty('--shade', (turn * 0.14).toFixed(3));
    } else {
      flap.style.display = 'none';
      base.style.setProperty('--shade', '0');
    }
    this.place(base, stay);

    // Solo el recorte entero lleva la sala impresa; plegado, se ve el dorso.
    this.showSheets(done === 0 ? (unfolding ? from + 1 : from) : null, base, front, width);

    // El paquete se desliza hacia el centro a medida que se pliega; en medio, la tarjeta se levanta
    // de la mesa y da una vuelta antes de abrirse en la sala siguiente.
    const shiftX = (width / 4) * clamp(level) + (width / 8) * clamp(level - 2);
    const shiftY = (height / 4) * clamp(level - 1) + (height / 8) * clamp(level - 3);
    const flourish = span(progress, FOLD_SPAN, 1 - FOLD_SPAN);
    const lift = Math.sin(Math.PI * flourish);
    packet.style.transformOrigin = `${width / 8}px ${height / 8}px`;
    packet.style.transform =
      `translate(${shiftX.toFixed(1)}px, ${shiftY.toFixed(1)}px) ` +
      `translateZ(${(lift * 90).toFixed(1)}px) rotateY(${(360 * flourish).toFixed(1)}deg) ` +
      `rotateZ(${(-9 * lift).toFixed(2)}deg)`;
    packet.style.setProperty('--lift', lift.toFixed(3));
  }

  /** Pliegues hechos (con decimales) a lo largo de un tramo de 0 a 1, cada uno con su suavizado. */
  private foldLevel(value: number): number {
    const scaled = clamp(value) * FOLDS;
    const done = Math.min(FOLDS - 1, Math.floor(scaled));
    return done + ease(clamp(scaled - done));
  }

  private place(element: HTMLElement, box: Box): void {
    element.style.left = `${box.left}px`;
    element.style.top = `${box.top}px`;
    element.style.width = `${box.width}px`;
    element.style.height = `${box.height}px`;
  }

  /** Pone en las dos caras las copias impresas de una sala, o las retira para dejar el dorso. */
  private showSheets(index: number | null, left: HTMLElement, right: HTMLElement, width: number) {
    if (this.sheetsShown !== index) {
      left.querySelector('.showcase-fold-sheet')?.remove();
      right.querySelector('.showcase-fold-sheet')?.remove();
      this.sheetsShown = index;
      const sheets = index === null ? null : this.sheetsOf(index);
      if (sheets) {
        left.prepend(sheets[0]);
        right.prepend(sheets[1]);
      }
    }
    // Cada copia mide lo que el recorte entero; la cara derecha enseña su mitad derecha.
    const sheets = index === null ? null : this.sheets.get(index);
    sheets?.forEach((sheet) => (sheet.style.width = `${width}px`));
    sheets?.[1].style.setProperty('left', `${-width / 2}px`);
  }

  private sheetsOf(index: number): [HTMLElement, HTMLElement] | null {
    const cached = this.sheets.get(index);
    const section = this.sections[index];
    if (cached || !section) {
      return cached ?? null;
    }

    const copy = () => {
      const sheet = this.document.createElement('div');
      sheet.className = 'showcase-fold-sheet';
      const clone = section.cloneNode(true) as HTMLElement;
      clone.classList.remove('is-open', 'is-current');
      clone.classList.add('is-shown');
      clone.removeAttribute('id');
      clone.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
      sheet.append(clone);
      return sheet;
    };

    const sheets: [HTMLElement, HTMLElement] = [copy(), copy()];
    this.sheets.set(index, sheets);
    return sheets;
  }

  private dropSheets(): void {
    this.host.nativeElement
      .querySelectorAll('.showcase-fold-sheet')
      .forEach((sheet) => sheet.remove());
    this.sheets.clear();
    this.sheetsShown = null;
    this.foldingFrom = null;
  }
}
