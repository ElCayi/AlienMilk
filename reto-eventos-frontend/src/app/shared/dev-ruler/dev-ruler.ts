/**
 * Regla de desarrollo: mide en px CSS lo que hay bajo el puntero, para hablar de espacios con
 * números y no a ojo. Solo en desarrollo (ng serve) y solo si se pide: se enciende con «?regla» en
 * la dirección y se apaga con «?regla=0» (se recuerda mientras dure la pestaña).
 *
 * - Al pasar el puntero: la caja del elemento (ancho × alto y cuerpo de letra, si tiene texto) y el
 *   aire hasta lo siguiente por arriba y por abajo, en la vertical del puntero.
 * - Alt + ↑ / Alt + ↓: sube al contenedor / vuelve a bajar.
 * - Alt + clic: fija ese elemento; al pasar sobre otro, la distancia entre los dos. Esc lo suelta.
 * - Mayús + arrastrar: mide lo que quieras, de un punto a otro (ancho y alto). Esc la borra.
 * - Alt + R: esconde o muestra la regla.
 *
 * «Lo siguiente» es el primer elemento con contenido que no contiene al medido: texto propio,
 * imagen, vídeo, botón… o fondo o borde visibles (una banda, una tarjeta).
 */
const STORAGE_KEY = 'am-regla';
const SCAN_LIMIT = 800;

export function startDevRuler(document: Document): () => void {
  const window = document.defaultView;
  if (!window) {
    return () => {};
  }

  const param = new URLSearchParams(window.location.search).get('regla');
  if (param !== null) {
    window.sessionStorage.setItem(STORAGE_KEY, param === '0' ? '0' : '1');
  }
  if (window.sessionStorage.getItem(STORAGE_KEY) !== '1') {
    return () => {};
  }

  const style = document.createElement('style');
  style.textContent = `
    [data-dev-ruler], [data-dev-ruler] * { pointer-events: none !important; }
    [data-dev-ruler] { position: fixed; inset: 0; z-index: 2147483647; font: 600 11px/1.3 ui-monospace, monospace; }
    [data-dev-ruler][hidden] { display: none; }
    [data-dev-ruler] .r-box { position: fixed; outline: 1px solid #ff3d7f; background: rgb(255 61 127 / 0.06); }
    [data-dev-ruler] .r-pin { position: fixed; outline: 1px dashed #00b3ff; background: rgb(0 179 255 / 0.06); }
    [data-dev-ruler] .r-line { position: fixed; width: 0; border-left: 1px solid #ff3d7f; }
    [data-dev-ruler] .r-hline { position: fixed; height: 0; border-top: 1px solid #00b3ff; }
    [data-dev-ruler] .r-line.is-pin { border-left-color: #00b3ff; }
    [data-dev-ruler] .r-tag { position: fixed; padding: 2px 5px; border-radius: 3px; color: #fff; background: #ff3d7f; white-space: nowrap; }
    [data-dev-ruler] .r-tag.is-pin { background: #00b3ff; }
    [data-dev-ruler] .r-tag.is-info { background: #211e24; }
    [data-dev-ruler] .r-free { position: fixed; outline: 1px dashed #18a558; background: rgb(24 165 88 / 0.08); }
    [data-dev-ruler] .r-tag.is-free { background: #18a558; }
    html.dev-ruler-dragging, html.dev-ruler-dragging * { user-select: none !important; cursor: crosshair !important; }
  `;
  const layer = document.createElement('div');
  layer.setAttribute('data-dev-ruler', '');
  document.head.append(style);
  document.body.append(layer);

  let target: Element | null = null;
  let picked: Element | null = null;
  const trail: Element[] = [];
  let pinned: Element | null = null;
  let pointer = { x: 0, y: 0 };
  let frame = 0;
  /** La medida libre (Mayús + arrastrar), en coordenadas de la página: no se mueve al desplazarse. */
  let free: { x0: number; y0: number; x1: number; y1: number } | null = null;
  let dragging = false;

  const px = (value: number) => `${Math.round(value * 10) / 10} px`;

  const add = (
    className: string,
    box: { left: number; top: number; width?: number; height?: number },
    text?: string,
  ) => {
    const node = document.createElement('div');
    node.className = className;
    node.style.left = `${box.left}px`;
    node.style.top = `${box.top}px`;
    if (box.width !== undefined) node.style.width = `${box.width}px`;
    if (box.height !== undefined) node.style.height = `${box.height}px`;
    if (text) node.textContent = text;
    layer.append(node);
    return node;
  };

  /** Pinta algo: fondo propio, o la tinta que en la portada le pinta el fondo líquido. */
  const paints = (element: Element, css: CSSStyleDeclaration) =>
    css.backgroundColor !== 'rgba(0, 0, 0, 0)' ||
    css.backgroundImage !== 'none' ||
    element.hasAttribute('data-backdrop-ink');

  const ownText = (element: Element) =>
    [...element.childNodes].some((node) => node.nodeType === 3 && node.textContent?.trim());

  const hasContent = (element: Element) => {
    if (element === document.body || element === document.documentElement) return false;
    if (element.matches('img, video, svg, canvas, iframe, button, input, select, textarea, hr'))
      return true;
    if (ownText(element)) return true;
    const css = window.getComputedStyle(element);
    const edged = ['Top', 'Bottom', 'Left', 'Right'].some(
      (side) => parseFloat(css.getPropertyValue(`border-${side.toLowerCase()}-width`)) > 0,
    );
    return paints(element, css) || edged;
  };

  /** Lo primero con contenido por encima (dir −1) o por debajo (dir 1) de la caja, en la vertical x. */
  const neighbour = (element: Element, rect: DOMRect, x: number, dir: -1 | 1) => {
    const edge = dir < 0 ? rect.top : rect.bottom;
    for (let step = 1; step <= SCAN_LIMIT; step++) {
      const y = edge + dir * step;
      if (y < 0 || y > window.innerHeight) return null;
      for (const hit of document.elementsFromPoint(x, y)) {
        if (hit.contains(element) || element.contains(hit) || !hasContent(hit)) continue;
        const box = hit.getBoundingClientRect();
        if (dir < 0 ? box.bottom <= edge + 0.5 : box.top >= edge - 0.5) {
          return { box, gap: dir < 0 ? edge - box.bottom : box.top - edge };
        }
      }
    }
    return null;
  };

  /** El borde más cercano, por arriba o por abajo, de un contenedor pintado (una banda, una tarjeta). */
  const containerEdge = (element: Element, rect: DOMRect, dir: -1 | 1) => {
    let best: number | null = null;
    for (
      let parent = element.parentElement;
      parent && parent !== document.body;
      parent = parent.parentElement
    ) {
      // Solo cuenta un borde que se vea: el contenedor pinta fondo o tiene filete por ese lado.
      const css = window.getComputedStyle(parent);
      if (
        !paints(parent, css) &&
        !(parseFloat(dir < 0 ? css.borderTopWidth : css.borderBottomWidth) > 0)
      )
        continue;
      const box = parent.getBoundingClientRect();
      const gap = dir < 0 ? rect.top - box.top : box.bottom - rect.bottom;
      if (gap > 0.5 && (best === null || gap < best)) best = gap;
    }
    return best;
  };

  const describe = (element: Element, rect: DOMRect) => {
    const name =
      element.tagName.toLowerCase() +
      [...element.classList]
        .slice(0, 2)
        .map((name) => `.${name}`)
        .join('');
    const css = window.getComputedStyle(element);
    const font = element.textContent?.trim() ? ` · letra ${px(parseFloat(css.fontSize))}` : '';
    return `${name}  ${px(rect.width)} × ${px(rect.height)}${font}`;
  };

  const drawFree = () => {
    if (!free) return;
    const left = Math.min(free.x0, free.x1) - window.scrollX;
    const top = Math.min(free.y0, free.y1) - window.scrollY;
    const width = Math.abs(free.x1 - free.x0);
    const height = Math.abs(free.y1 - free.y0);
    add('r-free', { left, top, width, height });
    // El ancho encima (o debajo, si no cabe) y el alto a la derecha; si es casi una línea, solo esa.
    if (width >= 1) {
      const labelTop = top > 22 ? top - 20 : top + height + 4;
      add('r-tag is-free', { left: left + width / 2 - 24, top: labelTop }, `↔ ${px(width)}`);
    }
    if (height >= 1) {
      add(
        'r-tag is-free',
        { left: left + width + 6, top: top + height / 2 - 8 },
        `↕ ${px(height)}`,
      );
    }
  };

  const draw = () => {
    frame = 0;
    layer.replaceChildren();
    drawFree();
    if (dragging) return;
    const element = picked ?? target;
    if (!element || !element.isConnected) return;
    const rect = element.getBoundingClientRect();
    add('r-box', { left: rect.left, top: rect.top, width: rect.width, height: rect.height });
    const infoTop = rect.top > 22 ? rect.top - 20 : rect.bottom + 4;
    const info = add('r-tag is-info', { left: 0, top: infoTop }, describe(element, rect));
    // Dentro de la pantalla: en móvil, la etiqueta es más ancha que muchos elementos.
    const room = window.innerWidth - info.offsetWidth - 2;
    info.style.left = `${Math.max(2, Math.min(rect.left, room))}px`;

    const x = Math.min(Math.max(pointer.x, rect.left + 1), rect.right - 1);

    if (pinned && pinned.isConnected && pinned !== element) {
      const pin = pinned.getBoundingClientRect();
      add('r-pin', { left: pin.left, top: pin.top, width: pin.width, height: pin.height });
      const [upper, lower] = pin.top <= rect.top ? [pin, rect] : [rect, pin];
      const vertical = lower.top - upper.bottom;
      if (vertical > 0) {
        add('r-line is-pin', { left: x, top: upper.bottom, height: vertical });
        add(
          'r-tag is-pin',
          { left: x + 6, top: upper.bottom + vertical / 2 - 8 },
          `↕ ${px(vertical)}`,
        );
      }
      const [first, second] = pin.left <= rect.left ? [pin, rect] : [rect, pin];
      const horizontal = second.left - first.right;
      if (horizontal > 0) {
        const y = Math.min(Math.max(pointer.y, rect.top + 1), rect.bottom - 1);
        add('r-hline', { left: first.right, top: y, width: horizontal });
        add(
          'r-tag is-pin',
          { left: first.right + horizontal / 2 - 20, top: y + 4 },
          `↔ ${px(horizontal)}`,
        );
      }
      if (vertical <= 0 && horizontal <= 0) {
        // Uno dentro del otro: el aire del de dentro hasta los bordes de arriba y de abajo del de fuera.
        const inside = (a: DOMRect, b: DOMRect) =>
          a.top >= b.top - 0.5 &&
          a.bottom <= b.bottom + 0.5 &&
          a.left >= b.left - 0.5 &&
          a.right <= b.right + 0.5;
        const [inner, outer] = inside(pin, rect)
          ? [pin, rect]
          : inside(rect, pin)
            ? [rect, pin]
            : [null, null];
        if (inner && outer) {
          const above = inner.top - outer.top;
          const below = outer.bottom - inner.bottom;
          add('r-line is-pin', { left: x, top: outer.top, height: above });
          add(
            'r-tag is-pin',
            { left: x + 6, top: outer.top + above / 2 - 8 },
            `↑ ${px(above)} por dentro`,
          );
          add('r-line is-pin', { left: x, top: inner.bottom, height: below });
          add(
            'r-tag is-pin',
            { left: x + 6, top: inner.bottom + below / 2 - 8 },
            `↓ ${px(below)} por dentro`,
          );
        } else {
          add('r-tag is-pin', { left: x + 6, top: rect.top + 4 }, 'se solapan');
        }
      }
      return;
    }

    for (const dir of [-1, 1] as const) {
      const near = neighbour(element, rect, x, dir);
      const edge = containerEdge(element, rect, dir);
      // Lo que llegue antes: el siguiente elemento o el borde del bloque que lo contiene.
      const toEdge = edge !== null && (!near || edge < near.gap);
      const gap = toEdge ? edge : near?.gap;
      if (gap === undefined || gap === null) continue;
      const top = dir < 0 ? rect.top - gap : rect.bottom;
      add('r-line', { left: x, top, height: gap });
      const label = `${dir < 0 ? '↑' : '↓'} ${px(gap)}${toEdge ? ' hasta el borde' : ''}`;
      add('r-tag', { left: x + 6, top: top + gap / 2 - 8 }, label);
    }
  };

  const schedule = () => {
    if (!frame) frame = window.requestAnimationFrame(draw);
  };

  const onDown = (event: PointerEvent) => {
    if (!event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const x = event.clientX + window.scrollX;
    const y = event.clientY + window.scrollY;
    free = { x0: x, y0: y, x1: x, y1: y };
    dragging = true;
    document.documentElement.classList.add('dev-ruler-dragging');
    schedule();
  };

  const onUp = () => {
    if (!dragging) return;
    dragging = false;
    document.documentElement.classList.remove('dev-ruler-dragging');
    schedule();
  };

  const onMove = (event: PointerEvent) => {
    pointer = { x: event.clientX, y: event.clientY };
    if (dragging && free) {
      free.x1 = event.clientX + window.scrollX;
      free.y1 = event.clientY + window.scrollY;
      schedule();
      return;
    }
    const hit = document.elementFromPoint(event.clientX, event.clientY);
    if (hit !== target) {
      target = hit;
      picked = null;
      trail.length = 0;
    }
    schedule();
  };

  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && (pinned || free)) {
      // Primero la medida libre; después, el elemento fijado.
      if (free) free = null;
      else pinned = null;
      schedule();
      return;
    }
    if (!event.altKey) return;
    const current = picked ?? target;
    if (
      event.key === 'ArrowUp' &&
      current?.parentElement &&
      current.parentElement !== document.body
    ) {
      event.preventDefault();
      trail.push(current);
      picked = current.parentElement;
      schedule();
    } else if (event.key === 'ArrowDown' && trail.length) {
      event.preventDefault();
      picked = trail.pop() ?? null;
      if (picked === target) picked = null;
      schedule();
    } else if (event.key.toLowerCase() === 'r') {
      event.preventDefault();
      layer.hidden = !layer.hidden;
    }
  };

  const onClick = (event: MouseEvent) => {
    // Soltar el arrastre de la medida libre no debe pulsar el enlace o el botón de debajo.
    if (event.shiftKey && free) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (!event.altKey) return;
    event.preventDefault();
    event.stopPropagation();
    pinned = picked ?? target;
    schedule();
  };

  window.addEventListener('pointerdown', onDown, true);
  window.addEventListener('pointerup', onUp, true);
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('scroll', schedule, { passive: true, capture: true });
  window.addEventListener('resize', schedule);
  window.addEventListener('keydown', onKey);
  window.addEventListener('click', onClick, true);

  return () => {
    window.cancelAnimationFrame(frame);
    window.removeEventListener('pointerdown', onDown, true);
    window.removeEventListener('pointerup', onUp, true);
    window.removeEventListener('pointermove', onMove);
    document.documentElement.classList.remove('dev-ruler-dragging');
    window.removeEventListener('scroll', schedule, { capture: true });
    window.removeEventListener('resize', schedule);
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('click', onClick, true);
    layer.remove();
    style.remove();
  };
}
