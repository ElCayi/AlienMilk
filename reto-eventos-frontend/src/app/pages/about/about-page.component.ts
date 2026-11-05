import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SpecimenCultureComponent } from '../../features/about/specimen-culture.component';
import { CollaboratorsDoorComponent } from '../../features/collaboration/collaborators-door.component';
import { FitBoxDirective } from '../../shared/fit-box/fit-box.directive';
import { FitLineDirective } from '../../shared/fit-line/fit-line.directive';

/** Las capas de la arquitectura ejecutiva, una pestaña por capa (el texto de cada una, en la plantilla). */
const ARCHITECTURE: readonly { id: string; code: string; label: string }[] = [
  { id: 'direccion', code: '01', label: 'Dirección fundadora' },
  { id: 'iea', code: '02', label: 'IEA' },
  { id: 'sea', code: '03', label: 'SEA' },
  { id: 'continuidad', code: '04', label: 'Continuidad' },
];

/** Las etapas del recorrido de la 02, para la copia que empalma la cinta en móvil (la lista visible
 *  está escrita en la plantilla). */
const CHAIN_COPY: readonly { code: string; label: string; end?: boolean }[] = [
  { code: '01', label: 'Localización' },
  { code: '02', label: 'Recogida' },
  { code: '03', label: 'Tránsito' },
  { code: '04', label: 'Recepción' },
  { code: '05', label: 'Acondicionamiento' },
  { code: '06', label: 'Evaluación' },
  { code: '07', label: 'Conservación' },
  { code: '08', label: 'Incorporación', end: true },
];

/** Nosotros, vestida con el lenguaje visual del resto del sitio. */
@Component({
  selector: 'app-about-page',
  standalone: true,
  imports: [
    RouterLink,
    SpecimenCultureComponent,
    CollaboratorsDoorComponent,
    FitBoxDirective,
    FitLineDirective,
  ],
  templateUrl: './about-page.component.html',
  styleUrls: ['./about-page.component.css', './about-page.mobile.css'],
})
export class AboutPageComponent {
  protected readonly architecture = ARCHITECTURE;
  protected readonly chainCopy = CHAIN_COPY;
  protected readonly activeTab = signal(0);
  /** El bloque de la arquitectura empieza plegado: solo la cabecera y las pestañas. */
  protected readonly archOpen = signal(false);

  /** En móvil, los textos largos de la 02 y la 04 desplegados con su «Leer más» (por orden, 0–3). */
  protected readonly openTexts = signal<ReadonlySet<number>>(new Set());

  /**
   * Despliega o pliega un texto. Al plegarlo, la página sube lo que ha encogido para que el botón se
   * quede bajo el dedo, en vez de saltar muy por encima de la vista.
   */
  toggleText(index: number, block: HTMLElement): void {
    const open = new Set(this.openTexts());
    const closing = open.delete(index);
    if (!closing) {
      open.add(index);
    }
    const button = block.nextElementSibling as HTMLElement | null;
    const before = button?.getBoundingClientRect().top ?? 0;
    this.openTexts.set(open);
    if (closing && button) {
      requestAnimationFrame(() => {
        window.scrollBy({ top: button.getBoundingClientRect().top - before, behavior: 'instant' });
      });
    }
  }

  /** Una pestaña elige su capa y, si el bloque está plegado, lo despliega. Pulsar la pestaña que ya
   *  está abierta lo repliega. */
  openTab(index: number): void {
    if (this.archOpen() && this.activeTab() === index) {
      this.archOpen.set(false);
      return;
    }
    this.activeTab.set(index);
    this.openArch();
  }

  /** El botón de debajo de las pestañas: despliega o repliega el bloque. */
  toggleArch(): void {
    if (this.archOpen()) {
      this.archOpen.set(false);
    } else {
      this.openArch();
    }
  }

  /**
   * Despliega el bloque y, en móvil y tableta, baja la página lo justo para verlo entero, hasta su
   * último borde, sin que las pestañas se escondan bajo la barra de arriba. Como los desplegables
   * de Sesiones y Localizaciones.
   */
  private openArch(): void {
    const wasOpen = this.archOpen();
    this.archOpen.set(true);
    if (wasOpen || !window.matchMedia('(max-width: 1000px)').matches) {
      return;
    }
    // Tras pintar el contenido desplegado.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const block = document.querySelector<HTMLElement>('.us-arch');
        const tabs = block?.querySelector<HTMLElement>('.us-arch-bar');
        if (!block || !tabs) {
          return;
        }
        const air = 16;
        const topbar = document.querySelector<HTMLElement>('.topbar')?.offsetHeight ?? 0;
        const overflow = block.getBoundingClientRect().bottom + air - window.innerHeight;
        const room = tabs.getBoundingClientRect().top - topbar - air;
        const distance = Math.min(overflow, room);
        if (distance > 0) {
          const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          window.scrollBy({ top: distance, behavior: reduced ? 'auto' : 'smooth' });
        }
      }),
    );
  }

  /** Pestañas con teclado: las flechas pasan a la siguiente o la anterior, Inicio y Fin a los extremos. */
  moveTab(event: KeyboardEvent, index: number): void {
    const last = this.architecture.length - 1;
    const next =
      event.key === 'ArrowRight'
        ? (index + 1) % (last + 1)
        : event.key === 'ArrowLeft'
          ? (index + last) % (last + 1)
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : -1;
    if (next < 0) {
      return;
    }
    event.preventDefault();
    this.activeTab.set(next);
    this.archOpen.set(true);
    document.getElementById(`us-arch-tab-${this.architecture[next].id}`)?.focus();
  }

  goToSection(event: MouseEvent, section: HTMLElement): void {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }
    // El router tiene desactivado el desplazamiento a fragmentos; esta navegación es local.
    event.preventDefault();
    section.scrollIntoView({ behavior: 'instant', block: 'start' });
    section.focus({ preventScroll: true });
  }
}
