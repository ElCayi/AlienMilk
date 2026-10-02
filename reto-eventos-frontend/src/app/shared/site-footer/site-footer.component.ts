import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
  WritableSignal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { ContactService } from '../../core/services/contact.service';
import { describeDays, formatHour, siteStatus } from '../../features/contact/opening-hours';
import { SOCIAL_LINKS } from '../../features/contact/social-links';

/**
 * Pie común de la web. No deja margen propio: cada página decide cómo termina su último bloque,
 * y el pie se apoya directamente debajo.
 */
@Component({
  selector: 'app-site-footer',
  standalone: true,
  imports: [NgTemplateOutlet, RouterLink],
  templateUrl: './site-footer.component.html',
  styleUrl: './site-footer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteFooterComponent {
  private readonly contactService = inject(ContactService);
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly now = signal(new Date());

  readonly contacto = this.contactService.contacto;
  readonly days = computed(() => describeDays(this.contacto()?.diasApertura ?? []));
  readonly hours = computed(() => {
    const contacto = this.contacto();
    return contacto
      ? `${formatHour(contacto.horaApertura)} a ${formatHour(contacto.horaCierre)}`
      : '';
  });
  readonly phoneHref = computed(
    () => `tel:${this.contacto()?.telefono?.replace(/[^\d+]/g, '') ?? ''}`,
  );
  /** Permite partir el correo en la arroba y no a mitad de palabra. */
  readonly emailParts = computed(() => {
    const email = this.contacto()?.email ?? '';
    const arroba = email.lastIndexOf('@');
    return [email.slice(0, arroba), email.slice(arroba + 1)];
  });
  /** Mismo canal que usa la portada para las propuestas de Collaborators. */
  readonly proposalHref = computed(
    () =>
      `mailto:${this.contacto()?.email ?? ''}?subject=${encodeURIComponent('Propuesta de muestra para evaluación')}`,
  );

  readonly socials = SOCIAL_LINKS;

  readonly status = computed(() => {
    const contacto = this.contacto();
    return contacto ? siteStatus(contacto, this.now()) : null;
  });

  constructor() {
    this.contactService.load();

    // El pie vive toda la sesión: con revisar el estado de la sede cada minuto basta.
    const timer = setInterval(() => this.now.set(new Date()), 60_000);
    this.destroyRef.onDestroy(() => clearInterval(timer));

    // En móvil el carrusel del ecosistema arranca en la unidad actual, no en la primera. Se
    // vuelve a colocar cada vez que el carril pasa a ser deslizable (por ejemplo, al estrechar la
    // ventana desde escritorio).
    afterNextRender(() => {
      const track = this.unitTrack()?.nativeElement;
      if (!track) {
        return;
      }

      let placed = false;
      const observer = new ResizeObserver(() => {
        const scrollable = track.scrollWidth > track.clientWidth;
        if (scrollable && !placed) {
          this.goToSlide(track, this.currentUnit, 'instant');
          this.unitSlide.set(this.currentUnit);
        }
        placed = scrollable;
      });
      observer.observe(track);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  /** Desde otra página el router ya sube arriba; desde la portada hay que hacerlo a mano. */
  goHome(event: Event): void {
    event.preventDefault();
    this.router.navigate(['/']).then(() => this.scrollTop());
  }

  scrollTop(): void {
    this.document.defaultView?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /*
   * En móvil el ecosistema es un carrusel que se desliza con el dedo. Estas funciones mantienen
   * las barritas indicadoras sincronizadas con la tarjeta visible.
   */
  readonly units = ['AlienMilk Archive', 'AlienMilk Sessions', 'AlienMilk Collaborators'];
  /** Índice de la unidad en la que está el visitante: Sessions. */
  readonly currentUnit = 1;
  readonly unitSlide = signal(this.currentUnit);
  private readonly unitTrack = viewChild<ElementRef<HTMLElement>>('unitTrack');

  trackSlide(track: HTMLElement, active: WritableSignal<number>): void {
    const slides = [...track.children] as HTMLElement[];
    const atEnd = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
    if (atEnd) {
      active.set(slides.length - 1);
      return;
    }

    const origin = slides[0].offsetLeft;
    let nearest = 0;
    slides.forEach((slide, index) => {
      const distance = Math.abs(slide.offsetLeft - origin - track.scrollLeft);
      if (distance < Math.abs(slides[nearest].offsetLeft - origin - track.scrollLeft)) {
        nearest = index;
      }
    });
    active.set(nearest);
  }

  /** Centra la tarjeta en el carril; el navegador ajusta solo la primera y la última al borde. */
  goToSlide(track: HTMLElement, index: number, behavior: ScrollBehavior = 'smooth'): void {
    const slides = [...track.children] as HTMLElement[];
    const slide = slides[index];
    const left =
      slide.offsetLeft - slides[0].offsetLeft - (track.clientWidth - slide.offsetWidth) / 2;
    track.scrollTo({ left, behavior });
  }
}
