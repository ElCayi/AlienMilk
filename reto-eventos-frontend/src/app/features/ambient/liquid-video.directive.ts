import { DOCUMENT } from '@angular/common';
import { afterNextRender, DestroyRef, Directive, ElementRef, inject, Input } from '@angular/core';

const VERTEX = `
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

// Cubre como object-fit: cover anclado abajo y desplaza el muestreo alrededor del cursor: arrastre
// en la dirección del movimiento y una leve ondulación que se apaga con la fuerza. El fundido a
// leche del borde inferior también se calcula aquí, así que el cursor deforma sus lenguas igual.
const FRAGMENT = `
precision mediump float;
uniform sampler2D uVideo;
uniform vec2 uCanvas;
uniform vec2 uVideoSize;
uniform vec2 uMouse;
uniform vec2 uVelocity;
uniform float uStrength;
uniform float uTime;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int octave = 0; octave < 4; octave++) {
    value += amplitude * noise(p);
    p *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

// vUv.y crece hacia abajo en pantalla (el canvas va volteado): la leche sube desde abajo.
float melt(vec2 uv) {
  float edge = uv.y + (fbm(vec2(uv.x * 4.0, uv.y * 7.0)) - 0.5) * 0.28;
  return 1.0 - smoothstep(0.5, 0.74, edge);
}

vec2 cover(vec2 uv) {
  float canvasAspect = uCanvas.x / uCanvas.y;
  float videoAspect = uVideoSize.x / uVideoSize.y;
  if (canvasAspect > videoAspect) {
    return vec2(uv.x, uv.y * videoAspect / canvasAspect);
  }
  return vec2((uv.x - 0.5) * canvasAspect / videoAspect + 0.5, uv.y);
}

void main() {
  vec2 aspect = vec2(uCanvas.x / uCanvas.y, 1.0);
  vec2 delta = (vUv - uMouse) * aspect;
  float falloff = exp(-dot(delta, delta) / 0.035);
  float ripple = sin(length(delta) * 28.0 - uTime * 2.4) * 0.004;
  vec2 offset = (uVelocity * 0.9 + normalize(delta + 1e-4) * ripple) * falloff * uStrength;
  vec2 uv = clamp(vUv - offset, 0.0, 1.0);
  float alpha = melt(uv);
  gl_FragColor = vec4(texture2D(uVideo, cover(uv)).rgb * alpha, alpha);
}`;

/**
 * Pinta el vídeo del hero en un canvas y lo deforma con el cursor, como un líquido espeso.
 * El canvas hereda las clases del vídeo (posición y volteo), calcula su propio fundido y se dibuja
 * encima; si no hay WebGL, ratón o se pide reducir el movimiento, el vídeo se queda tal cual.
 */
@Directive({ selector: 'video[appLiquidVideo]', standalone: true })
export class LiquidVideoDirective {
  @Input() appLiquidVideo = '';

  private readonly host = inject<ElementRef<HTMLVideoElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => this.start());
  }

  private start(): void {
    const window = this.document.defaultView;
    const video = this.host.nativeElement;
    const surface = video.parentElement;
    if (
      !window ||
      !surface ||
      !window.matchMedia('(hover: hover) and (pointer: fine)').matches ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    const canvas = this.document.createElement('canvas');
    canvas.className = `${video.className} ${this.appLiquidVideo}`.trim();
    canvas.setAttribute('aria-hidden', 'true');
    const gl = canvas.getContext('webgl', { alpha: true, antialias: false });
    const program = gl && this.createProgram(gl);
    if (!gl || !program) {
      return;
    }

    video.after(canvas);
    // El vídeo sigue reproduciéndose como fuente, pero no se ve: su fundido fijo asomaría por
    // debajo de las lenguas que el cursor mueve.
    video.style.opacity = '0';
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    for (const [key, value] of [
      [gl.TEXTURE_MIN_FILTER, gl.LINEAR],
      [gl.TEXTURE_MAG_FILTER, gl.LINEAR],
      [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE],
      [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE],
    ]) {
      gl.texParameteri(gl.TEXTURE_2D, key, value);
    }

    const uniform = (name: string) => gl.getUniformLocation(program, name);
    const uniforms = {
      canvas: uniform('uCanvas'),
      videoSize: uniform('uVideoSize'),
      mouse: uniform('uMouse'),
      velocity: uniform('uVelocity'),
      strength: uniform('uStrength'),
      time: uniform('uTime'),
    };

    // El cursor se sigue con retraso: el líquido va detrás de la mano, no pegado a ella.
    const target = { x: 0.5, y: 0.5 };
    const mouse = { x: 0.5, y: 0.5 };
    const velocity = { x: 0, y: 0 };
    let strength = 0;
    let visible = true;
    let frame = 0;

    const resize = () => {
      const scale = Math.min(window.devicePixelRatio || 1, 1.5) * 0.75;
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * scale));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const onMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      // Se escucha en toda la ventana: el efecto sigue vivo sobre el fundido blanco, fuera del hero.
      if (event.clientY < rect.top || event.clientY > rect.bottom) {
        return;
      }
      // El canvas va volteado en vertical (scaleY(-1)): la parte alta de la pantalla es su y = 0.
      target.x = (event.clientX - rect.left) / rect.width;
      target.y = (event.clientY - rect.top) / rect.height;
      strength = Math.min(strength + 0.25, 1);
    };

    const render = (time: number) => {
      frame = window.requestAnimationFrame(render);
      if (!visible || video.readyState < video.HAVE_CURRENT_DATA) {
        return;
      }

      const nextX = mouse.x + (target.x - mouse.x) * 0.08;
      const nextY = mouse.y + (target.y - mouse.y) * 0.08;
      velocity.x += (nextX - mouse.x - velocity.x) * 0.2;
      velocity.y += (nextY - mouse.y - velocity.y) * 0.2;
      mouse.x = nextX;
      mouse.y = nextY;
      strength *= 0.965;

      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
      gl.uniform2f(uniforms.canvas, canvas.width, canvas.height);
      gl.uniform2f(uniforms.videoSize, video.videoWidth, video.videoHeight);
      gl.uniform2f(uniforms.mouse, mouse.x, mouse.y);
      gl.uniform2f(uniforms.velocity, velocity.x, velocity.y);
      gl.uniform1f(uniforms.strength, strength * 6);
      gl.uniform1f(uniforms.time, time / 1000);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    const resizeObserver = new ResizeObserver(resize);
    const visibility = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
    resizeObserver.observe(canvas);
    visibility.observe(surface);
    window.addEventListener('pointermove', onMove, { passive: true });
    resize();
    frame = window.requestAnimationFrame(render);

    this.destroyRef.onDestroy(() => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      visibility.disconnect();
      window.removeEventListener('pointermove', onMove);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      canvas.remove();
      video.style.opacity = '';
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
