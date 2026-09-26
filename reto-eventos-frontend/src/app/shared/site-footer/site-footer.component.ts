import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
  WritableSignal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { ContactService } from '../../core/services/contact.service';
import { describeDays, formatHour, siteStatus } from '../../features/contact/opening-hours';

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

  /** Redes de AlienMilk. Sin `href`, el icono se muestra pero no enlaza a ningún sitio. */
  readonly socials: { name: string; icon: 'instagram' | 'x' | 'linkedin'; href?: string }[] = [
    { name: 'Instagram', icon: 'instagram' },
    { name: 'X (Twitter)', icon: 'x' },
    { name: 'LinkedIn', icon: 'linkedin' },
  ];

  readonly status = computed(() => {
    const contacto = this.contacto();
    return contacto ? siteStatus(contacto, this.now()) : null;
  });

  constructor() {
    this.contactService.load();

    // El pie vive toda la sesión: con revisar el estado de la sede cada minuto basta.
    const timer = setInterval(() => this.now.set(new Date()), 60_000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
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
   * En móvil las columnas y el ecosistema son carruseles que se deslizan con el dedo. Estas
   * funciones mantienen las barritas indicadoras sincronizadas con el apartado visible.
   */
  readonly topSections = ['Presentación', 'Explora AlienMilk Sessions', 'Contacto'];
  readonly units = ['AlienMilk Archive', 'AlienMilk Sessions', 'AlienMilk Collaborators'];
  readonly topSlide = signal(0);
  readonly unitSlide = signal(0);

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

  goToSlide(track: HTMLElement, index: number): void {
    const slides = [...track.children] as HTMLElement[];
    track.scrollTo({ left: slides[index].offsetLeft - slides[0].offsetLeft, behavior: 'smooth' });
  }
}
