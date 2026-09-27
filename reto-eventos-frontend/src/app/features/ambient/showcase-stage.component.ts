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

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const ease = (value: number) => value * value * (3 - 2 * value);

/**
 * Escenario de la portada: las secciones que comparten escaparate se exponen en un solo recorte
 * fijo sobre la mesa, y el scroll pasa de una a otra como las páginas de un libro desplegable:
 * la mitad derecha del recorte gira sobre el lomo y descubre la sala siguiente, mientras sus piezas
 * se levantan del papel a destiempo.
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
        <div class="showcase-stage-table" aria-hidden="true">
          <span class="showcase-stage-probe"></span>
        </div>
        <ng-content />
      </div>
      <div class="showcase-fold" aria-hidden="true" inert>
        <div class="showcase-fold-piece showcase-fold-left"><span class="showcase-fold-shade"></span></div>
        <div class="showcase-fold-piece showcase-fold-under"><span class="showcase-fold-shade"></span></div>
        <div class="showcase-fold-flap">
          <div class="showcase-fold-piece showcase-fold-front">
            <span class="showcase-fold-shade"></span>
          </div>
          <div class="showcase-fold-piece showcase-fold-back">
            <span class="showcase-fold-shade"></span>
          </div>
        </div>
        <span class="showcase-fold-crease"></span>
      </div>
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
  private foldingFrom: number | null = null;

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

    const resize = () => {
      this.rescale();
      wake();
    };

    const media = window.matchMedia(STAGE_QUERY);
    const update = () => this.setStaged(media.matches);
    update();

    media.addEventListener('change', update);
    window.addEventListener('scroll', wake, { passive: true });
    window.addEventListener('resize', resize);
    this.document.addEventListener('pointerdown', outside);

    this.destroyRef.onDestroy(() => {
      window.cancelAnimationFrame(this.frame);
      window.clearTimeout(this.briefTimer);
      media.removeEventListener('change', update);
      window.removeEventListener('scroll', wake);
      window.removeEventListener('resize', resize);
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
      this.rescale();
      this.position = this.target();
      this.apply(this.position);
      this.settle();
      return;
    }

    this.host.nativeElement.style.removeProperty('--stage-zoom');
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

  /** Escala de las exposiciones: su altura de diseño reducida a la del recorte. */
  private rescale(): void {
    const root = this.host.nativeElement;
    const frame = root.querySelector<HTMLElement>('.showcase-stage-table')?.offsetHeight ?? 0;
    const design = root.querySelector<HTMLElement>('.showcase-stage-probe')?.offsetHeight ?? 0;
    const zoom = frame && design ? Math.min(1, frame / design) : 1;
    root.style.setProperty('--stage-zoom', zoom.toFixed(4));
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
   * Pasar página: la mitad derecha del recorte gira sobre el lomo como la hoja de un libro. Por
   * delante lleva la sala que se va; por detrás, la mitad izquierda de la que llega, cuya mitad
   * derecha espera debajo. Las piezas impresas se levantan del papel a destiempo, como las capas de
   * un libro desplegable: cada página las alza en su momento y proyectan sombra al hacerlo.
   */
  private fold(from: number | null, progress: number): void {
    const root = this.host.nativeElement;
    const rig = root.querySelector<HTMLElement>('.showcase-fold');
    const flap = root.querySelector<HTMLElement>('.showcase-fold-flap');
    const faces = {
      left: root.querySelector<HTMLElement>('.showcase-fold-left'),
      under: root.querySelector<HTMLElement>('.showcase-fold-under'),
      front: root.querySelector<HTMLElement>('.showcase-fold-front'),
      back: root.querySelector<HTMLElement>('.showcase-fold-back'),
    };
    const table = root.querySelector<HTMLElement>('.showcase-stage-table');
    const crease = root.querySelector<HTMLElement>('.showcase-fold-crease');
    const { left, under, front, back } = faces;
    if (!rig || !flap || !left || !under || !front || !back || !table || !crease) {
      return;
    }

    if (from === null) {
      rig.classList.remove('is-folding');
      this.foldingFrom = null;
      return;
    }

    if (this.foldingFrom !== from) {
      // Cada transición parte de copias recientes: el carrusel o los datos pueden haber cambiado.
      this.dropSheets();
      this.foldingFrom = from;
      const width = table.offsetWidth;
      const leaving = this.sheetsOf(from);
      const arriving = this.sheetsOf(from + 1);
      if (!leaving || !arriving) {
        return;
      }
      this.print(left, leaving[0], 0, width);
      this.print(front, leaving[1], -width / 2, width);
      this.print(back, arriving[0], 0, width);
      this.print(under, arriving[1], -width / 2, width);
    }
    rig.classList.add('is-folding');

    const turn = ease(progress);
    const rise = Math.sin(Math.PI * turn);
    flap.style.transform = `rotateY(${(-180 * turn).toFixed(2)}deg)`;
    crease.style.opacity = (rise * 0.8).toFixed(3);

    // Sombra de la hoja sobre lo que tapa y lo que destapa, y su propio sombreado al girar.
    left.style.setProperty('--shade', (0.3 * rise * turn).toFixed(3));
    under.style.setProperty('--shade', (0.3 * rise * (1 - turn)).toFixed(3));
    front.style.setProperty('--shade', (0.28 * rise).toFixed(3));
    back.style.setProperty('--shade', (0.28 * rise).toFixed(3));

    // Relieve: todas las páginas alzan sus piezas a la vez para que las que cruzan el lomo no se
    // partan; el destiempo lo ponen las capas, que suben más cuanto más cerca están del lector.
    for (const face of [left, under, front, back]) {
      face.style.setProperty('--lift', rise.toFixed(3));
    }
  }

  /** Coloca una copia impresa en una cara, desplazada para enseñar la mitad que le toca. */
  private print(face: HTMLElement, sheet: HTMLElement, offset: number, width: number): void {
    sheet.style.width = `${width}px`;
    sheet.style.left = `${offset}px`;
    face.prepend(sheet);
  }

  private sheetsOf(index: number): [HTMLElement, HTMLElement] | null {
    const section = this.sections[index];
    if (!section) {
      return null;
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

    return [copy(), copy()];
  }

  private dropSheets(): void {
    this.host.nativeElement
      .querySelectorAll('.showcase-fold-sheet')
      .forEach((sheet) => sheet.remove());
    this.foldingFrom = null;
  }
}
