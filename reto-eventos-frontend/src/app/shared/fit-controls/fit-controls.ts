/**
 * Norma para toda la web: el rótulo de un botón no se parte en dos líneas ni se sale de su caja. Si no
 * cabe, primero suelta la flecha del final; si aún no basta, baja la letra (con el espaciado, que va en
 * em) lo justo para caber. Solo por debajo de MIN_SCALE o de MIN_PX se le deja partir, porque ilegible
 * es peor que dos líneas.
 *
 * Entra solo: cualquier `button`, `a` o `[role=button]` que no sea texto en línea, con un
 * rótulo corto y sin bloques dentro. Los que deben ocupar varias líneas a propósito se excluyen con
 * `data-fit-wrap`. No toca los que ya llevan `appFitLine` dentro.
 *
 * Se arranca una vez desde app.ts; devuelve la función que lo para.
 */

const CONTROLS = 'button, a, [role="button"]';
const MAX_LABEL = 48;
const MIN_SCALE = 0.7;
const MIN_PX = 10;

export function startFitControls(document: Document): () => void {
  const win = document.defaultView;
  // Sin maquetación (jsdom en las pruebas) no hay nada que medir.
  if (!win?.ResizeObserver || typeof document.createRange().getClientRects !== 'function') {
    return () => undefined;
  }

  /** Lo que tocamos, para poder deshacerlo: elemento → su letra, su salto de línea y su display en línea. */
  const touched = new Map<HTMLElement, Set<HTMLElement>>();
  const original = new WeakMap<
    HTMLElement,
    { fontSize: string; whiteSpace: string; display: string }
  >();
  const hostsByParent = new WeakMap<Element, Set<HTMLElement>>();
  const hosts = new Set<HTMLElement>();
  const pending = new Set<HTMLElement>();
  let frame = 0;

  const isHost = (el: Element): el is HTMLElement => {
    if (!(el instanceof win.HTMLElement) || !el.matches(CONTROLS)) {
      return false;
    }
    if (el.closest('[data-fit-wrap], [data-dev-ruler]') || el.querySelector('[appfitline]')) {
      return false;
    }
    const style = win.getComputedStyle(el);
    if (style.display === 'inline' || style.display === 'none' || style.display === 'contents') {
      return false;
    }
    const label = (el.textContent ?? '').trim();
    if (!label || label.length > MAX_LABEL) {
      return false;
    }
    return true;
  };

  const reset = (host: HTMLElement) => {
    for (const el of touched.get(host) ?? []) {
      const saved = original.get(el);
      el.style.fontSize = saved?.fontSize ?? '';
      el.style.whiteSpace = saved?.whiteSpace ?? '';
      el.style.display = saved?.display ?? '';
    }
    touched.delete(host);
  };

  const remember = (host: HTMLElement, el: HTMLElement) => {
    if (!original.has(el)) {
      original.set(el, {
        fontSize: el.style.fontSize,
        whiteSpace: el.style.whiteSpace,
        display: el.style.display,
      });
    }
    let set = touched.get(host);
    if (!set) {
      set = new Set();
      touched.set(host, set);
    }
    set.add(el);
  };

  /** Sin poder partir líneas, ¿hay textos uno encima de otro? Entonces es una tarjeta (nombre arriba,
     detalle abajo), no un rótulo. */
  const stacked = (host: HTMLElement) => {
    const lines: DOMRect[] = [];
    const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.textContent?.trim()) {
        continue;
      }
      const range = document.createRange();
      range.selectNodeContents(node);
      lines.push(...[...range.getClientRects()].filter((rect) => rect.width > 0));
    }
    return lines.some((a) => lines.some((b) => b.top >= a.bottom - 1));
  };

  /** Cuánto se pasa: 1 si cabe; 1,2 si necesita un 20 % más de sitio del que hay. */
  const excess = (host: HTMLElement) => {
    const ratio = host.clientWidth ? host.scrollWidth / host.clientWidth : 1;
    const position = win.getComputedStyle(host).position;
    if (position === 'absolute' || position === 'fixed') {
      return ratio;
    }
    // Su caja: se sube mientras el contenedor solo envuelve al botón (un <p> o un grid que crecen con
    // él) hasta el primero que le marca un ancho: la tarjeta, la columna, la banda.
    const own = host.getBoundingClientRect();
    // Si el botón es más ancho que su rótulo, es su caja la que manda (va estirado a lo ancho), no él.
    const content = document.createRange();
    content.selectNodeContents(host);
    const hs = win.getComputedStyle(host);
    const natural =
      content.getBoundingClientRect().width +
      parseFloat(hs.paddingLeft) +
      parseFloat(hs.paddingRight) +
      parseFloat(hs.borderLeftWidth) +
      parseFloat(hs.borderRightWidth);
    if (natural < own.width - 2) {
      return ratio;
    }
    for (let box = host.parentElement; box && box !== document.body; box = box.parentElement) {
      const style = win.getComputedStyle(box);
      if (style.display === 'contents') {
        continue;
      }
      // Un carrusel o una tira con scroll: lo que no cabe se desliza, no encoge.
      if (style.overflowX === 'auto' || style.overflowX === 'scroll') {
        break;
      }
      const rect = box.getBoundingClientRect();
      const left = rect.left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft);
      const right =
        rect.right - parseFloat(style.borderRightWidth) - parseFloat(style.paddingRight);
      const over = Math.max(own.right - right, left - own.left, 0);
      if (over > 0.5) {
        return own.width > over ? Math.max(ratio, own.width / (own.width - over)) : ratio;
      }
      if (right - left > own.width + 1 || style.overflowX !== 'visible') {
        break;
      }
    }
    return ratio;
  };

  /** La letra de cada pieza tal como la deja el CSS, para escalarlas todas en proporción. */
  const measure = (host: HTMLElement) => {
    const pieces = [host, ...host.querySelectorAll<HTMLElement>('*')].filter(
      (el) => !(el instanceof win.SVGElement) || el.tagName.toLowerCase() === 'svg',
    ) as HTMLElement[];
    return { pieces, base: pieces.map((el) => parseFloat(win.getComputedStyle(el).fontSize)) };
  };

  const apply = (host: HTMLElement, { pieces, base }: ReturnType<typeof measure>, k: number) => {
    pieces.forEach((el, i) => {
      remember(host, el);
      el.style.fontSize = `${base[i] * k}px`;
    });
  };

  /** La flecha del final (un icono sin texto, el último del botón). Lo primero que sobra si no cabe:
     sin ella, la letra puede quedarse grande. Un icono al principio (compartir…) no se toca. */
  const arrowOf = (host: HTMLElement) => {
    const last = host.lastElementChild as HTMLElement | null;
    if (!last || last.textContent?.trim() || !(last.matches('svg') || last.querySelector('svg'))) {
      return null;
    }
    // Solo si de verdad va detrás del rótulo.
    return host.textContent?.trim() ? last : null;
  };

  const dropArrow = (host: HTMLElement, arrow: HTMLElement) => {
    remember(host, arrow);
    arrow.style.display = 'none';
  };

  /** Si al botón se le quitó la flecha para caber. */
  const droppedOf = new WeakMap<HTMLElement, boolean>();

  /** Lo que encoge cada botón por sí solo (1 si cabe); 0 si no entra en la norma o se le deja partir. */
  const scaleOf = new WeakMap<HTMLElement, number>();

  const fit = (host: HTMLElement) => {
    reset(host);
    scaleOf.set(host, 0);
    if (!host.isConnected || !isHost(host)) {
      return;
    }

    remember(host, host);
    host.style.whiteSpace = 'nowrap';
    if (stacked(host)) {
      reset(host);
      return;
    }
    let ratio = excess(host);
    droppedOf.set(host, false);
    const arrow = ratio > 1.005 ? arrowOf(host) : null;
    if (arrow) {
      dropArrow(host, arrow);
      droppedOf.set(host, true);
      ratio = excess(host);
    }
    let scale = 1;
    const sizes = ratio > 1.005 ? measure(host) : null;

    for (let step = 0; sizes && step < 6 && ratio > 1.005; step++) {
      scale = Math.floor((scale / ratio) * 0.995 * 1000) / 1000;
      if (scale < MIN_SCALE || sizes.base[0] * scale < MIN_PX) {
        reset(host);
        return;
      }
      apply(host, sizes, scale);
      ratio = excess(host);
    }
    scaleOf.set(host, scale);
  };

  /** Los botones gemelos (misma clase en la misma sección, como «Explorar» en cada tarjeta del
     carrusel) encogen todos lo que el que más, para que no cambien de tamaño de una tarjeta a otra. */
  const groupsOf = () => {
    const groups = new Map<string, HTMLElement[]>();
    const sections = new Map<Element, number>();
    for (const host of hosts) {
      if (!host.className || !scaleOf.get(host)) {
        continue;
      }
      const section = host.closest('section, footer, header, main') ?? document.body;
      if (!sections.has(section)) {
        sections.set(section, sections.size);
      }
      const key = `${sections.get(section)} ${host.className}`;
      groups.set(key, [...(groups.get(key) ?? []), host]);
    }
    return [...groups.values()].filter((group) => group.length > 1);
  };

  const equalize = (group: HTMLElement[]) => {
    const least = Math.min(...group.map((host) => scaleOf.get(host)!));
    const drop = group.some((host) => droppedOf.get(host));
    for (const host of group) {
      // Partir de la letra del CSS: deshacer lo suyo, medir y aplicar la escala del grupo.
      reset(host);
      remember(host, host);
      host.style.whiteSpace = 'nowrap';
      const arrow = drop ? arrowOf(host) : null;
      if (arrow) {
        dropArrow(host, arrow);
      }
      if (least < 1) {
        apply(host, measure(host), least);
      }
    }
  };

  const resize = new win.ResizeObserver((entries) => {
    for (const entry of entries) {
      const target = entry.target as HTMLElement;
      if (target.matches(CONTROLS)) {
        pending.add(target);
      }
      for (const host of hostsByParent.get(target) ?? []) {
        pending.add(host);
      }
    }
    schedule();
  });

  const track = (host: HTMLElement) => {
    const parent = host.parentElement;
    if (parent && !hostsByParent.get(parent)?.has(host)) {
      let set = hostsByParent.get(parent);
      if (!set) {
        set = new Set();
        hostsByParent.set(parent, set);
      }
      set.add(host);
      resize.observe(parent);
      resize.observe(host);
    }
    hosts.add(host);
    pending.add(host);
  };

  const scan = (root: ParentNode) => {
    if (root instanceof win.Element && root.matches(CONTROLS)) {
      track(root as HTMLElement);
    }
    root.querySelectorAll<HTMLElement>(CONTROLS).forEach(track);
  };

  const flush = () => {
    frame = 0;
    const batch = [...pending];
    pending.clear();
    for (const host of batch) {
      if (!host.isConnected) {
        reset(host);
        hosts.delete(host);
        resize.unobserve(host);
        continue;
      }
      fit(host);
    }
    const fitted = new Set(batch);
    groupsOf()
      .filter((group) => group.some((host) => fitted.has(host)))
      .forEach(equalize);
  };

  function schedule() {
    if (!frame && pending.size) {
      frame = win!.requestAnimationFrame(flush);
    }
  }

  const mutations = new win.MutationObserver((records) => {
    for (const record of records) {
      record.addedNodes.forEach((node) => {
        if (node instanceof win.Element) {
          scan(node);
        }
      });
      const near =
        record.target instanceof win.Element ? record.target : record.target.parentElement;
      const host = near?.closest<HTMLElement>(CONTROLS);
      if (host) {
        track(host);
      }
    }
    schedule();
  });

  // La caja que manda puede estar varios niveles por encima: al cambiar la ventana, se repasan todos.
  const onResize = () => {
    hosts.forEach((host) => pending.add(host));
    schedule();
  };
  win.addEventListener('resize', onResize);

  scan(document.body);
  schedule();
  mutations.observe(document.body, { childList: true, characterData: true, subtree: true });
  void document.fonts?.ready.then(() => {
    scan(document.body);
    schedule();
  });

  return () => {
    win.removeEventListener('resize', onResize);
    mutations.disconnect();
    resize.disconnect();
    if (frame) {
      win.cancelAnimationFrame(frame);
    }
    [...touched.keys()].forEach(reset);
  };
}
