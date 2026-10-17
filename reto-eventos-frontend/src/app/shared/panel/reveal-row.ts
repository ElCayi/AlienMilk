/** Aire entre lo que se enseña y el borde de la vista (o la barra fija de arriba). */
const MARGIN = 12;

/**
 * Tras desplegar una fila, la vista baja lo justo para enseñar su ficha entera, pero nunca deja la fila
 * pulsada por encima de la vista, debajo de la barra fija: si la ficha no cabe, la fila se queda arriba
 * del todo y el resto se ve bajando a mano. Si ya se ve entera, la vista no se mueve.
 */
export function revealExpanded(detail: HTMLElement | null): void {
  if (!detail) {
    return;
  }
  const row = (detail.previousElementSibling as HTMLElement | null) ?? detail;
  const top = (document.querySelector('.bar')?.getBoundingClientRect().bottom ?? 0) + MARGIN;
  const bottom = window.innerHeight - MARGIN;
  const rowTop = row.getBoundingClientRect().top;
  const detailBottom = detail.getBoundingClientRect().bottom;

  let delta = 0;
  if (rowTop < top) {
    delta = rowTop - top;
  } else if (detailBottom > bottom) {
    delta = Math.min(detailBottom - bottom, rowTop - top);
  }
  if (delta) {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollBy({ top: delta, behavior: reduce ? 'auto' : 'smooth' });
  }
}

/** Llegar a una fila desde otra vista: la fila arriba, justo debajo de la barra fija, y su ficha debajo. */
export function revealAtTop(detail: HTMLElement | null): void {
  if (!detail) {
    return;
  }
  const row = (detail.previousElementSibling as HTMLElement | null) ?? detail;
  const top = (document.querySelector('.bar')?.getBoundingClientRect().bottom ?? 0) + MARGIN;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollBy({ top: row.getBoundingClientRect().top - top, behavior: reduce ? 'auto' : 'smooth' });
}
