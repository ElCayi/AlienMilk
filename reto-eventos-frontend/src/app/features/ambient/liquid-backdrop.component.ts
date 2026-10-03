import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  Input,
} from '@angular/core';

const VERTEX = `
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

// La textura se lava casi hasta el color del lienzo y el cursor la arrastra como un líquido espeso,
// con el mismo gesto que el vídeo del hero. Donde se remueve, la leche se espesa un momento: la
// textura gana presencia y vuelve a aclararse al asentarse.
// Desde uDepthStart, a la vez y en tres cuartos de pantalla, los márgenes (fuera de la columna de
// uDepthColumn, con borde neto) ganan textura y el centro se blanquea; el remolino del cursor sigue
// asomando sobre ese blanco. Entre la primera sección y la segunda, la franja uDepthCut corta el
// blanco de lado a lado, como si fueran dos bloques. El de abajo es de tinta, con una ventana blanca
// para el planetario, hasta uDepthCut3, el corte antes de Collaborators.
const FRAGMENT = `
precision mediump float;
uniform sampler2D uTexture;
uniform vec2 uCanvas;
uniform vec2 uImage;
uniform vec2 uMouse;
uniform vec2 uVelocity;
uniform float uStrength;
uniform float uTime;
uniform float uAmount;
uniform vec3 uBase;
uniform vec2 uView;
uniform float uDepthStart;
uniform vec2 uDepthColumn;
uniform vec2 uDepth;
uniform vec2 uDepthCut;
uniform vec2 uDepthCut3;
uniform vec2 uDark2;
uniform float uDepthRound;
uniform vec2 uDark;
uniform vec3 uInk;
varying vec2 vUv;

vec2 cover(vec2 uv) {
  float canvasAspect = uCanvas.x / uCanvas.y;
  float imageAspect = uImage.x / uImage.y;
  if (canvasAspect > imageAspect) {
    return vec2(uv.x, (uv.y - 0.5) * imageAspect / canvasAspect + 0.5);
  }
  return vec2((uv.x - 0.5) * canvasAspect / imageAspect + 0.5, uv.y);
}

void main() {
  vec2 aspect = vec2(uCanvas.x / uCanvas.y, 1.0);
  vec2 delta = (vUv - uMouse) * aspect;
  float falloff = exp(-dot(delta, delta) / 0.035);
  float ripple = sin(length(delta) * 28.0 - uTime * 2.4) * 0.004;
  vec2 offset = (uVelocity * 0.9 + normalize(delta + 1e-4) * ripple) * falloff * uStrength;
  vec3 color = texture2D(uTexture, cover(clamp(vUv - offset, 0.0, 1.0))).rgb;
  float thicken = falloff * clamp(uStrength / 6.0, 0.0, 1.0) * 0.35;

  vec2 px = vec2(vUv.x, 1.0 - vUv.y) * uView;
  float t = smoothstep(uDepthStart, uDepthStart + uView.y * 0.75, px.y);
  // Las columnas se quedan un poco por fuera de la sección, para que el texto no toque su borde, y
  // solo aparecen si les queda ancho: en móvil serían dos filos sueltos junto al borde.
  float gutter = clamp(uView.x * 0.045, 24.0, 80.0);
  float column = uDepthColumn.y + gutter;
  // El blanco, recortado por la franja del corte, con las esquinas apenas redondeadas salvo dos en
  // diagonal, con una curva amplia: abajo a la derecha del bloque de arriba y arriba a la izquierda
  // del de abajo. Cada mitad de la franja toma el radio de su bloque, para que el borde suavizado
  // no deje una fila a medio blanquear bajo la curva.
  float wide = step(40.0, uDepthColumn.x - column);
  float outside = abs(px.x - uDepthColumn.x) - column;
  float away = max(uDepthCut.x - px.y, px.y - uDepthCut.y);
  bool lower = px.y > (uDepthCut.x + uDepthCut.y) * 0.5;
  float r = (px.x < uDepthColumn.x) == lower ? uDepthRound : 16.0;
  // Borde suavizado un par de px: el lienzo va a media resolución y la curva grande se escalonaba.
  float block = 1.0 - smoothstep(r - 1.5, r + 1.5, length(max(vec2(outside + r, r - away), 0.0)));
  // El tercer corte, antes de Collaborators, en diagonal como el primero: la curva amplia abajo a
  // la derecha del bloque de tinta y arriba a la izquierda del siguiente.
  float away3 = max(uDepthCut3.x - px.y, px.y - uDepthCut3.y);
  bool above3 = px.y < (uDepthCut3.x + uDepthCut3.y) * 0.5;
  float r3 = (px.x > uDepthColumn.x) == above3 ? uDepthRound : 16.0;
  block *= 1.0 - smoothstep(r3 - 1.5, r3 + 1.5, length(max(vec2(outside + r3, r3 - away3), 0.0)));
  float side = (1.0 - block) * wide;
  float white = t * (1.0 - side) * uDepth.y;
  vec3 base = mix(uBase, vec3(1.0), white);
  // Del segundo bloque hasta el tercer corte, tinta, salvo una ventana blanca entre la cabecera
  // (uDark.x) y la ficha (uDark2.x): el planetario, con columnas finas de tinta (rim) a los lados y
  // la curva amplia arriba a la derecha y abajo a la izquierda, como los marcos; las otras dos
  // esquinas, con el redondeo pequeño.
  float rim = clamp(uView.x * 0.012, 14.0, 26.0);
  float mid = (uDark.x + uDark2.x) * 0.5;
  float rw = (px.x > uDepthColumn.x) == (px.y < mid) ? uDepthRound : 16.0;
  vec2 q = vec2(outside + rim, max(uDark.x - px.y, px.y - uDark2.x)) + rw;
  float pane = 1.0 - smoothstep(-1.5, 1.5, length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - rw);
  float ink = block * float(lower) * step(px.y, uDark2.y) * uDark.y * (1.0 - pane);
  base = mix(base, uInk, ink);
  float amount = uAmount * (1.0 - white) + t * side * uDepth.x;
  gl_FragColor = vec4(mix(base, color, amount + thicken), 1.0);
}`;

/**
 * Fondo fijo con la textura de la casa, casi transparente, que el cursor remueve. Va por debajo
 * del contenido, en el lugar del lienzo de la página: las secciones de la portada no pintan fondo
 * propio para que la lámina se vea continua.
 * Sin ratón, con «reducir movimiento» o sin WebGL se queda como imagen fija.
 */
@Component({
  selector: 'app-liquid-backdrop',
  standalone: true,
  template: '<canvas aria-hidden="true"></canvas>',
  styles: `
    :host {
      position: fixed;
      inset: 0;
      /* Por debajo del vídeo del hero (-2) y de todo el contenido. */
      z-index: -3;
      pointer-events: none;
    }

    canvas {
      width: 100%;
      height: 100%;
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LiquidBackdropComponent {
  @Input() src = 'alienmilk-showcase-texture.webp';
  /** Cuánta textura se ve sobre el blanco (0–1). */
  @Input() amount = 0.07;
  /**
   * Bloque desde el que cambia el fondo: al empezar su primera sección, los márgenes ganan textura
   * en dos columnas de borde neto, a los lados de esa sección, y el centro se queda en blanco.
   */
  @Input() deepen?: HTMLElement;
  /** Textura que ganan las columnas de los márgenes. */
  @Input() depth = 0.45;

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => this.start());
  }

  private start(): void {
    const window = this.document.defaultView;
    const canvas = this.host.nativeElement.querySelector('canvas');
    const gl = canvas?.getContext('webgl', { alpha: false, antialias: false });
    const program = gl && this.createProgram(gl);
    if (!window || !canvas || !gl || !program) {
      this.host.nativeElement.remove();
      return;
    }

    const interactive =
      window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const uniform = (name: string) => gl.getUniformLocation(program, name);
    const uniforms = {
      canvas: uniform('uCanvas'),
      image: uniform('uImage'),
      mouse: uniform('uMouse'),
      velocity: uniform('uVelocity'),
      strength: uniform('uStrength'),
      time: uniform('uTime'),
      amount: uniform('uAmount'),
      base: uniform('uBase'),
      view: uniform('uView'),
      depthStart: uniform('uDepthStart'),
      depthColumn: uniform('uDepthColumn'),
      depth: uniform('uDepth'),
      depthCut: uniform('uDepthCut'),
      depthCut3: uniform('uDepthCut3'),
      dark2: uniform('uDark2'),
      depthRound: uniform('uDepthRound'),
      dark: uniform('uDark'),
      ink: uniform('uInk'),
    };

    const wideLayout = window.matchMedia('(min-width: 1001px)');
    const image = new Image();
    let ready = false;
    const target = { x: 0.5, y: 0.5 };
    const mouse = { x: 0.5, y: 0.5 };
    const velocity = { x: 0, y: 0 };
    let strength = 0;
    let frame = 0;
    let running = false;

    const draw = (time: number) => {
      gl.uniform2f(uniforms.canvas, canvas.width, canvas.height);
      gl.uniform2f(uniforms.image, image.naturalWidth, image.naturalHeight);
      gl.uniform2f(uniforms.mouse, mouse.x, mouse.y);
      gl.uniform2f(uniforms.velocity, velocity.x, velocity.y);
      gl.uniform1f(uniforms.strength, strength * 6);
      gl.uniform1f(uniforms.time, time / 1000);
      gl.uniform1f(uniforms.amount, this.amount);
      // #fbf6f5, el lienzo de la página.
      gl.uniform3f(uniforms.base, 0.984, 0.965, 0.961);
      gl.uniform2f(uniforms.view, canvas.clientWidth, canvas.clientHeight);
      // Medidas en px CSS respecto a la ventana, como el lienzo fijo: se toman en cada dibujo
      // porque la sección se mueve con el scroll.
      const first = this.deepen?.firstElementChild?.getBoundingClientRect();
      const second = this.deepen?.children[1]?.getBoundingClientRect();
      if (first) {
        gl.uniform1f(uniforms.depthStart, first.top);
        gl.uniform2f(uniforms.depthColumn, (first.left + first.right) / 2, first.width / 2);
        gl.uniform2f(uniforms.depth, this.depth, 1);
        // El corte, de grosor fijo, va en medio del hueco entre las dos secciones.
        const gap = second ? second.top - first.bottom : 0;
        const cut = first.bottom + gap / 2;
        const half = Math.min(Math.max(window.innerWidth * 0.024, 24), 48, gap / 3);
        gl.uniform2f(uniforms.depthCut, gap > 0 ? cut - half : -2, gap > 0 ? cut + half : -1);
        // El elemento marcado empieza la tinta de abajo; otro corte igual lo cierra, con algo de
        // aire. Con las columnas, como sus estilos.
        const brief = wideLayout.matches
          ? this.deepen?.querySelector('[data-backdrop-cut]')?.getBoundingClientRect()
          : undefined;
        const air = Math.min(Math.max(window.innerWidth * 0.055, 48), 96);
        const cut3 = brief ? brief.bottom + air + half : 0;
        gl.uniform2f(uniforms.depthCut3, brief ? cut3 - half : -2, brief ? cut3 + half : -1);
        gl.uniform2f(uniforms.dark2, brief?.top ?? 0, brief ? cut3 : -1);
        // La esquina grande, más abierta que la de los marcos.
        gl.uniform1f(uniforms.depthRound, Math.min(Math.max(window.innerWidth * 0.07, 64), 120));
        // La tinta llega hasta el final del elemento marcado; con las columnas, como sus estilos.
        const dark = wideLayout.matches
          ? this.deepen?.querySelector('[data-backdrop-dark]')?.getBoundingClientRect()
          : undefined;
        gl.uniform2f(uniforms.dark, dark?.bottom ?? 0, dark ? 1 : 0);
        // #211e24, la tinta de la casa.
        gl.uniform3f(uniforms.ink, 0.129, 0.118, 0.141);
      } else {
        gl.uniform2f(uniforms.dark, 0, 0);
        gl.uniform2f(uniforms.dark2, 0, -1);
        gl.uniform2f(uniforms.depth, 0, 0);
      }
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    // La imagen es estática: solo se redibuja mientras el líquido se mueve.
    const render = (time: number) => {
      const nextX = mouse.x + (target.x - mouse.x) * 0.08;
      const nextY = mouse.y + (target.y - mouse.y) * 0.08;
      velocity.x += (nextX - mouse.x - velocity.x) * 0.2;
      velocity.y += (nextY - mouse.y - velocity.y) * 0.2;
      mouse.x = nextX;
      mouse.y = nextY;
      strength *= 0.965;
      draw(time);

      if (strength > 0.002 || Math.hypot(velocity.x, velocity.y) > 0.0002) {
        frame = window.requestAnimationFrame(render);
      } else {
        running = false;
      }
    };

    const wake = () => {
      if (ready && !running) {
        running = true;
        frame = window.requestAnimationFrame(render);
      }
    };

    // El espesor depende de dónde quede el bloque: al hacer scroll o cambiar su tamaño se
    // redibuja una vez, salvo que el líquido ya se esté moviendo y lo haga en cada fotograma.
    let pending = 0;
    const redraw = () => {
      if (ready && !running && !pending) {
        pending = window.requestAnimationFrame((time) => {
          pending = 0;
          draw(time);
        });
      }
    };

    const resize = () => {
      const scale = Math.min(window.devicePixelRatio || 1, 1.5) * 0.5;
      canvas.width = Math.max(1, Math.round(window.innerWidth * scale));
      canvas.height = Math.max(1, Math.round(window.innerHeight * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (ready) {
        draw(performance.now());
      }
    };

    const onMove = (event: PointerEvent) => {
      target.x = event.clientX / window.innerWidth;
      target.y = 1 - event.clientY / window.innerHeight;
      strength = Math.min(strength + 0.25, 1);
      wake();
    };

    image.onload = () => {
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
      for (const [key, value] of [
        [gl.TEXTURE_MIN_FILTER, gl.LINEAR],
        [gl.TEXTURE_MAG_FILTER, gl.LINEAR],
        [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE],
        [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE],
      ]) {
        gl.texParameteri(gl.TEXTURE_2D, key, value);
      }
      ready = true;
      draw(performance.now());
    };
    image.src = this.src;

    resize();
    window.addEventListener('resize', resize);
    if (interactive) {
      window.addEventListener('pointermove', onMove, { passive: true });
    }
    let blockResize: ResizeObserver | undefined;
    if (this.deepen) {
      window.addEventListener('scroll', redraw, { passive: true });
      blockResize = new ResizeObserver(redraw);
      blockResize.observe(this.deepen);
    }

    this.destroyRef.onDestroy(() => {
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(pending);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('scroll', redraw);
      blockResize?.disconnect();
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    });
  }

  private createProgram(gl: WebGLRenderingContext): WebGLProgram | null {
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) {
        return null;
      }
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
    };

    const vertex = compile(gl.VERTEX_SHADER, VERTEX);
    const fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT);
    const program = gl.createProgram();
    if (!vertex || !fragment || !program) {
      return null;
    }

    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null;
  }
}
