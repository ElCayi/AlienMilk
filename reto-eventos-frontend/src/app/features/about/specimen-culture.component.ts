import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';

interface Point {
  x: number;
  y: number;
}

interface Circle extends Point {
  r: number;
}

/**
 * Forma del cultivo. Centro y radio en una unidad de composición: el lado del cuadrado que ocupa
 * la pareja central. Las formas de los lados salen de él.
 */
interface Blob {
  x: number;
  y: number;
  r: number;
  /** Unida a otra forma por un cuello: índice de la madre y curvatura del cuello. */
  join?: { to: number; neck: number };
  /**
   * Escala de la muestra respecto al encuadre común; por debajo de 1 la muestra se ve en
   * miniatura. En un grupo unido mandan la escala y el foco de la forma madre.
   */
  zoom: number;
  /** Punto de la muestra (0–1) que la forma lleva centrado; sin él, ve lo que tiene detrás. */
  focus?: Point;
  /** Deriva: amplitud en unidades de composición, periodo en segundos. */
  drift: number;
  period: number;
  phase: number;
}

interface Placed extends Circle {
  blob: Blob;
  home: Point;
}

interface Source {
  image: CanvasImageSource;
  width: number;
  height: number;
}

const POSTER = 'alienmilk-about-ferrofluid-poster.webp';
const TAU = Math.PI * 2;
/** Tamaño de la composición respecto al mayor que cabe en el lienzo. */
const SCALE = 0.98;
/** La muestra se ve algo más alejada dentro de las formas, sin cambiar su tamaño. */
const SOURCE_ZOOM = 0.88;
const TREMOR_DURATION = 0.55;
const TREMOR_INTERVAL = 12;

const BLOBS: Blob[] = [
  // La pareja: la célula y la que se le está separando.
  bubble(0.284, 0.406, 0.279, 0.002, 16, 0),
  bud(0.726, 0.192, 0.19, { to: 0, neck: 0.035 }, 0.008, 12, 1.1),
  // Debajo, otra grande que ya se ha soltado.
  bubble(0.529, 0.827, 0.147, 0.006, 14, 2.3),
  // A la derecha, una mediana en el borde y otra más grande.
  bubble(1.036, 0.292, 0.067, 0.008, 12, 0.4),
  bubble(0.83, 0.585, 0.092, 0.006, 15, 1.4),
  // A la izquierda, junto al texto: una mediana y una pareja pequeña que también se separa.
  bubble(-0.04, 0.215, 0.069, 0.008, 13, 2.9),
  bubble(-0.05, 0.558, 0.047, 0.006, 11, 3.8),
  bud(-0.045, 0.475, 0.031, { to: 6, neck: 0.012 }, 0.004, 9, 4.6),
  // Pequeñas que todavía cuelgan de las grandes. Derivan poco: con más, el cuello se estrangula y
  // parecen sueltas.
  bud(0.957, 0.08, 0.046, { to: 1, neck: 0.026 }, 0.004, 9, 3.2),
  bud(0.708, 0.892, 0.027, { to: 2, neck: 0.02 }, 0.004, 8, 4.1),
  // Esporas sueltas: cada una lleva en miniatura un trozo del centro de la muestra, donde siempre
  // hay ferrofluido.
  spore(0.902, 0.447, 0.043, 0.36, { x: 0.42, y: 0.38 }, 11, 0.6),
  spore(0.087, 0.08, 0.033, 0.3, { x: 0.6, y: 0.45 }, 10, 1.9),
  spore(0.182, 0.814, 0.035, 0.32, { x: 0.58, y: 0.66 }, 13, 3.6),
  spore(0.427, 0.033, 0.019, 0.24, { x: 0.5, y: 0.52 }, 7, 5),
  spore(0.035, 0.69, 0.023, 0.26, { x: 0.36, y: 0.5 }, 9, 2.2),
  spore(0.758, 0.764, 0.036, 0.3, { x: 0.46, y: 0.6 }, 12, 5.6),
  spore(0.941, 0.778, 0.019, 0.24, { x: 0.55, y: 0.4 }, 8, 0.9),
];

/** Forma suelta que enseña lo que tiene detrás. */
function bubble(
  x: number,
  y: number,
  r: number,
  drift: number,
  period: number,
  phase: number,
): Blob {
  return { x, y, r, zoom: 1, drift, period, phase };
}

/** Forma que cuelga de otra por un cuello y comparte su imagen. */
function bud(
  x: number,
  y: number,
  r: number,
  join: { to: number; neck: number },
  drift: number,
  period: number,
  phase: number,
): Blob {
  return { x, y, r, join, zoom: 1, drift, period, phase };
}

function spore(
  x: number,
  y: number,
  r: number,
  zoom: number,
  focus: Point,
  period: number,
  phase: number,
): Blob {
  return { x, y, r, zoom, focus, drift: 0.016, period, phase };
}

/** Cada forma pertenece al grupo de la forma suelta de la que cuelga, directa o indirectamente. */
const ROOTS = BLOBS.map((_, index) => {
  let root = index;
  for (let join = BLOBS[root].join; join; join = BLOBS[root].join) {
    root = join.to;
  }
  return root;
});

/** Una oscilación corta que se apaga suavemente. */
function tremor(elapsed: number): number {
  if (!Number.isFinite(elapsed) || elapsed < 0 || elapsed >= TREMOR_DURATION) {
    return 0;
  }

  const fade = 1 - elapsed / TREMOR_DURATION;
  return Math.sin(elapsed * TAU * 9) * fade * fade;
}

/** Caja que ocupa la composición, con aire para la deriva: así nada roza el borde del lienzo. */
const EXTENT = BLOBS.reduce(
  (box, { x, y, r }) => ({
    left: Math.min(box.left, x - r - 0.025),
    right: Math.max(box.right, x + r + 0.025),
    top: Math.min(box.top, y - r - 0.025),
    bottom: Math.max(box.bottom, y + r + 0.025),
  }),
  { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity },
);

/**
 * Cultivo de la muestra: pompas grandes unidas por cuellos viscosos y esporas sueltas que flotan
 * alrededor. Un único vídeo alimenta un lienzo; cada grupo recorta su parte.
 */
@Component({
  selector: 'app-specimen-culture',
  standalone: true,
  template: `
    <canvas #canvas role="img" [attr.aria-label]="label"></canvas>
    <video #video loop muted playsinline preload="none" aria-hidden="true">
      <source src="alienmilk-about-ferrofluid.webm" type="video/webm" />
      <source src="alienmilk-about-ferrofluid.mp4" type="video/mp4" />
    </video>
  `,
  styleUrl: './specimen-culture.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpecimenCultureComponent {
  readonly label =
    'Gotas de una muestra lechosa, unas unidas por cuellos viscosos y otras flotando sueltas.';

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly video = viewChild.required<ElementRef<HTMLVideoElement>>('video');
  private readonly poster = new Image();
  private context: CanvasRenderingContext2D | null = null;
  /** Lienzo aparte donde cada grupo unido recorta la muestra con su silueta. */
  private scratch: CanvasRenderingContext2D | null = null;
  private width = 0;
  private height = 0;
  private frameId = 0;
  private lastFrame = 0;
  private placed: Placed[] = [];
  private hoveredRoot: number | null = null;
  private hoverStartedAt = -Infinity;
  private idleStartsAt = Infinity;
  private visible = false;

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => destroyRef.onDestroy(this.start()));
  }

  private start(): () => void {
    const canvas = this.canvas().nativeElement;
    const video = this.video().nativeElement;
    this.context = canvas.getContext('2d');
    this.scratch = document.createElement('canvas').getContext('2d');

    // El póster pinta el cultivo mientras llega el vídeo, y para siempre si se pide menos
    // movimiento.
    this.poster.src = POSTER;
    this.poster.decode().then(
      () => this.draw(performance.now() / 1000),
      () => undefined,
    );

    const resize = new ResizeObserver(() => {
      this.fit(canvas);
      this.draw(performance.now() / 1000);
    });
    resize.observe(canvas);

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return () => resize.disconnect();
    }

    this.idleStartsAt = performance.now() / 1000 + 8;
    window.addEventListener('pointermove', this.onPointerMove, { passive: true });

    // El atributo muted no basta cuando Angular crea el elemento: sin la propiedad, el navegador
    // no permite la reproducción automática.
    video.muted = true;
    // Fuera de la vista no se decodifica ni se pinta.
    const visibility = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      if (entry.isIntersecting) {
        this.play(video);
      } else {
        this.pause(video);
      }
    });
    visibility.observe(canvas);

    return () => {
      resize.disconnect();
      visibility.disconnect();
      window.removeEventListener('pointermove', this.onPointerMove);
      this.pause(video);
    };
  }

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (!this.visible || (event.pointerType !== 'mouse' && event.pointerType !== 'pen')) {
      return;
    }

    const rect = this.canvas().nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    let hovered: number | null = null;
    for (let index = this.placed.length - 1; index >= 0; index--) {
      const { x: blobX, y: blobY, r } = this.placed[index];
      if (Math.hypot(x - blobX, y - blobY) <= r) {
        hovered = ROOTS[index];
        break;
      }
    }

    if (hovered !== this.hoveredRoot) {
      this.hoveredRoot = hovered;
      if (hovered !== null) {
        this.hoverStartedAt = performance.now() / 1000;
      }
    }
  };

  private play(video: HTMLVideoElement): void {
    video.play().catch(() => undefined);
    if (!this.frameId) {
      this.frameId = requestAnimationFrame(this.tick);
    }
  }

  private pause(video: HTMLVideoElement): void {
    video.pause();
    cancelAnimationFrame(this.frameId);
    this.frameId = 0;
  }

  private readonly tick = (now: number): void => {
    this.frameId = requestAnimationFrame(this.tick);
    // El vídeo va a 30 fotogramas por segundo: pintar más a menudo solo gasta batería.
    if (now - this.lastFrame < 32) {
      return;
    }

    this.lastFrame = now;
    this.draw(now / 1000);
  };

  private fit(canvas: HTMLCanvasElement): void {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.width = canvas.clientWidth;
    this.height = canvas.clientHeight;
    for (const context of [this.context, this.scratch]) {
      if (context) {
        context.canvas.width = Math.round(this.width * ratio);
        context.canvas.height = Math.round(this.height * ratio);
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
      }
    }
  }

  private source(): Source | null {
    const video = this.video().nativeElement;
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth) {
      return { image: video, width: video.videoWidth, height: video.videoHeight };
    }

    if (this.poster.complete && this.poster.naturalWidth) {
      return {
        image: this.poster,
        width: this.poster.naturalWidth,
        height: this.poster.naturalHeight,
      };
    }

    return null;
  }

  private draw(time: number): void {
    const { context, scratch, width, height } = this;
    const source = this.source();
    if (!context || !scratch || !source || !width || !height) {
      return;
    }

    // La composición cabe entera en el lienzo, algo apartada del texto y subida: así la pareja
    // monta sobre las migas.
    const boxWidth = EXTENT.right - EXTENT.left;
    const boxHeight = EXTENT.bottom - EXTENT.top;
    const side = Math.min(width / boxWidth, height / boxHeight) * SCALE;
    const originX = (width - boxWidth * side) * 0.6 - EXTENT.left * side;
    const originY = (height - boxHeight * side) * 0.1 - EXTENT.top * side;

    // El temblor afecta a cada grupo entero para que sus cuellos no se separen.
    const hoverElapsed = time - this.hoverStartedAt;
    const idleElapsed = time - this.idleStartsAt;
    const vibration =
      hoverElapsed >= 0 && hoverElapsed < TREMOR_DURATION
        ? tremor(hoverElapsed)
        : 0.42 * tremor(idleElapsed % TREMOR_INTERVAL);

    // Cada forma deriva a su ritmo. Las unidas se alejan y se acercan de su madre, y el cuello
    // adelgaza y engorda con ellas, como un líquido espeso.
    const placed: Placed[] = BLOBS.map((blob, index) => {
      const angle = (time * TAU) / blob.period + blob.phase;
      const home = { x: originX + blob.x * side, y: originY + blob.y * side };
      const direction = ROOTS[index] * 2.4;
      const shake = vibration * 0.008 * side;
      return {
        blob,
        home,
        x: home.x + Math.cos(angle) * blob.drift * side + Math.cos(direction) * shake,
        y: home.y + Math.sin(angle * 1.3) * blob.drift * side + Math.sin(direction) * shake,
        r: blob.r * side * (1 + Math.sin(angle * 0.8) * 0.015),
      };
    });
    this.placed = placed;

    // El encuadre parte de la caja de la composición, pero muestra algo más de la muestra dentro
    // de cada forma. Los grupos de los bordes ajustan su encuadre para no dejar zonas vacías.
    const boxX = originX + EXTENT.left * side;
    const boxY = originY + EXTENT.top * side;
    const scale =
      Math.max((boxWidth * side) / source.width, (boxHeight * side) / source.height) * SOURCE_ZOOM;
    const offsetX = boxX + (boxWidth * side - source.width * scale) / 2;
    const offsetY = boxY + (boxHeight * side - source.height * scale) / 2;

    context.clearRect(0, 0, width, height);
    placed.forEach((root, index) => {
      if (ROOTS[index] !== index) {
        return;
      }

      const members = placed.filter((_, member) => ROOTS[member] === index);
      // El grupo escala la muestra alrededor de su foco, o de lo que su madre tiene detrás en
      // reposo, y se la lleva consigo al derivar.
      const { zoom, focus } = root.blob;
      const imageWidth = source.width * scale * zoom;
      const imageHeight = source.height * scale * zoom;
      let imageX = focus
        ? root.x - focus.x * imageWidth
        : root.x - (root.home.x - offsetX) * zoom;
      let imageY = focus
        ? root.y - focus.y * imageHeight
        : root.y - (root.home.y - offsetY) * zoom;

      const padding = 0.04 * side;
      const left = Math.min(...members.map((member) => member.x - member.r)) - padding;
      const right = Math.max(...members.map((member) => member.x + member.r)) + padding;
      const top = Math.min(...members.map((member) => member.y - member.r)) - padding;
      const bottom = Math.max(...members.map((member) => member.y + member.r)) + padding;
      imageX = Math.min(left, Math.max(right - imageWidth, imageX));
      imageY = Math.min(top, Math.max(bottom - imageHeight, imageY));

      if (members.length === 1) {
        context.save();
        traceRippleCircle(context, root, time);
        context.clip();
        context.drawImage(source.image, imageX, imageY, imageWidth, imageHeight);
        context.restore();
        return;
      }

      // Un grupo unido se recorta con su silueta completa en el lienzo aparte.
      scratch.clearRect(0, 0, width, height);
      scratch.fillStyle = '#000';
      members.forEach((member) => {
        traceRippleCircle(scratch, member, time);
        scratch.fill();
        if (member.blob.join) {
          const mother = placed[member.blob.join.to];
          fillNeck(scratch, mother, member, member.blob.join.neck * side);
        }
      });
      scratch.globalCompositeOperation = 'source-in';
      scratch.drawImage(source.image, imageX, imageY, imageWidth, imageHeight);
      scratch.globalCompositeOperation = 'source-over';
      context.drawImage(scratch.canvas, 0, 0, width, height);
    });
  }
}

/** El borde del recorte ondula despacio sin deformar el contenido del vídeo. */
function traceRippleCircle(
  context: CanvasRenderingContext2D,
  { x, y, r, blob }: Placed,
  time: number,
): void {
  const steps = Math.max(48, Math.ceil(r / 2));
  context.beginPath();
  for (let index = 0; index < steps; index++) {
    const angle = (index * TAU) / steps;
    const ripple =
      0.006 * Math.sin(angle * 6 - time * 1.8 + blob.phase) +
      0.002 * Math.sin(angle * 9 + time * 1.3 - blob.phase);
    const edgeX = x + Math.cos(angle) * r * (1 + ripple);
    const edgeY = y + Math.sin(angle) * r * (1 + ripple);
    if (index === 0) {
      context.moveTo(edgeX, edgeY);
    } else {
      context.lineTo(edgeX, edgeY);
    }
  }
  context.closePath();
}

/**
 * Cuello entre dos círculos: a cada lado, un arco tangente a ambos, como el puente que forma un
 * líquido al separarse. Si los arcos llegan a tocarse, el cuello se ha estrangulado y no se pinta.
 */
function fillNeck(context: CanvasRenderingContext2D, a: Circle, b: Circle, curve: number): void {
  const distance = Math.hypot(b.x - a.x, b.y - a.y);
  const along = { x: (b.x - a.x) / distance, y: (b.y - a.y) / distance };
  const across = { x: -along.y, y: along.x };
  const reachA = a.r + curve;
  const reachB = b.r + curve;
  const forward = (distance ** 2 + reachA ** 2 - reachB ** 2) / (2 * distance);
  const rise = Math.sqrt(Math.max(reachA ** 2 - forward ** 2, 0));
  if (rise <= curve) {
    return;
  }

  const [upper, lower] = [1, -1].map((side) => {
    const center = {
      x: a.x + along.x * forward + across.x * rise * side,
      y: a.y + along.y * forward + across.y * rise * side,
    };
    return {
      center,
      onA: {
        x: a.x + ((center.x - a.x) * a.r) / reachA,
        y: a.y + ((center.y - a.y) * a.r) / reachA,
      },
      onB: {
        x: b.x + ((center.x - b.x) * b.r) / reachB,
        y: b.y + ((center.y - b.y) * b.r) / reachB,
      },
    };
  });

  context.beginPath();
  context.moveTo(upper.onA.x, upper.onA.y);
  arcBetween(context, upper.center, curve, upper.onA, upper.onB);
  context.lineTo(lower.onB.x, lower.onB.y);
  arcBetween(context, lower.center, curve, lower.onB, lower.onA);
  context.closePath();
  context.fill();
}

/** Arco corto de un círculo entre dos de sus puntos. */
function arcBetween(
  context: CanvasRenderingContext2D,
  center: Point,
  radius: number,
  start: Point,
  end: Point,
): void {
  const from = Math.atan2(start.y - center.y, start.x - center.x);
  const to = Math.atan2(end.y - center.y, end.x - center.x);
  const sweep = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  context.arc(center.x, center.y, radius, from, to, sweep < 0);
}
