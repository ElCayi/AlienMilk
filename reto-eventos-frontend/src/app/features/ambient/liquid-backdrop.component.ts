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
  float thicken = falloff * clamp(uStrength / 6.0, 0.0, 1.0) * 0.16;
  gl_FragColor = vec4(mix(uBase, color, uAmount + thicken), 1.0);
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
    };

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

    this.destroyRef.onDestroy(() => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
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
