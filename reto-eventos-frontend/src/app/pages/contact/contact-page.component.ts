import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ContactService } from '../../core/services/contact.service';
import { FitLineDirective } from '../../shared/fit-line/fit-line.directive';
import { describeDays, formatHour, siteStatus } from '../../features/contact/opening-hours';
import { SOCIAL_LINKS } from '../../features/contact/social-links';

@Component({
  selector: 'app-contact-page',
  standalone: true,
  imports: [DatePipe, FitLineDirective, NgTemplateOutlet, RouterLink],
  templateUrl: './contact-page.component.html',
  styleUrl: './contact-page.component.css',
})
export class ContactPageComponent implements OnInit {
  private readonly contactService = inject(ContactService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly now = signal(new Date());

  readonly contacto = this.contactService.contacto;
  readonly error = this.contactService.error;
  readonly socials = SOCIAL_LINKS;

  readonly areas = [
    {
      number: '01',
      title: 'Reservas y sesiones',
      description: 'Una <b>plaza</b>, un <b>cambio de planes</b> o una <b>duda</b> sobre la experiencia que ha elegido.',
      preparation:
        'Indique la <b>sesión</b>, la <b>fecha</b> y la <b>referencia de su reserva</b>, si ya dispone de ella.',
    },
    {
      number: '02',
      title: 'Visitas y accesibilidad',
      description:
        'Prepare su <b>llegada</b>, consulte las <b>condiciones del recorrido</b> o solicite <b>acompañamiento</b>.',
      preparation:
        'Cuéntenos qué necesita y cuándo desea visitarnos. <b>No adjunte documentación médica</b>.',
    },
    {
      number: '03',
      title: 'Grupos e instituciones',
      description:
        '<b>Visitas de estudio</b>, <b>encuentros profesionales</b> y propuestas para compartir una sesión.',
      preparation:
        'Incluya el <b>número de participantes</b>, las <b>fechas previstas</b> y el <b>motivo</b> de la visita.',
    },
    {
      number: '04',
      title: 'Prensa, archivo e investigación',
      description:
        '<b>Información editorial</b>, <b>consultas al catálogo</b> y solicitudes de <b>documentación o imágenes</b>.',
      preparation:
        'Indique su <b>medio o proyecto</b>, el <b>material</b> que necesita y la <b>fecha</b> de publicación prevista.',
    },
  ];

  readonly status = computed(() => {
    const contacto = this.contacto();
    return contacto ? siteStatus(contacto, this.now()) : null;
  });

  readonly days = computed(() => describeDays(this.contacto()?.diasApertura ?? []));

  readonly hours = computed(() => {
    const contacto = this.contacto();
    return contacto
      ? `${formatHour(contacto.horaApertura)} a ${formatHour(contacto.horaCierre)}`
      : '';
  });

  /** «15002 A Coruña»: el código postal va delante de la ciudad, como en una dirección postal. */
  readonly postalCity = computed(() => {
    const contacto = this.contacto();
    return contacto ? [contacto.codigoPostal, contacto.ciudad].filter(Boolean).join(' ') : '';
  });

  readonly mapUrl = computed(() => {
    const contacto = this.contacto();
    const query = contacto ? [contacto.calle ?? contacto.direccion, this.postalCity()].join(', ') : '';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  });

  readonly phoneHref = computed(
    () => `tel:${this.contacto()?.telefono?.replace(/[^\d+]/g, '') ?? ''}`,
  );

  ngOnInit(): void {
    this.contactService.load();

    // El estado de la sede cambia con la hora: basta con revisarlo cada medio minuto.
    const timer = setInterval(() => this.now.set(new Date()), 30_000);
    this.destroyRef.onDestroy(() => clearInterval(timer));
  }

  retry(): void {
    this.contactService.load(true);
  }

  inquiryHref(subject: string): string {
    return `mailto:${this.contacto()?.email ?? ''}?subject=${encodeURIComponent(subject)}`;
  }

  goToSection(event: MouseEvent, section: HTMLElement): void {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }
    // El router tiene desactivado el desplazamiento a fragmentos; esta navegación es local.
    event.preventDefault();

    // Si la sección cabe bajo la barra, queda centrada en ese hueco; si es más alta, arranca
    // con aire bajo la barra. Así no asoma media sección vecina al llegar.
    const topbar = document.querySelector('.topbar')?.getBoundingClientRect().bottom ?? 0;
    const available = window.innerHeight - topbar;
    const { top, height } = section.getBoundingClientRect();
    const breathing = Math.min(48, available * 0.06);
    const offset = height + 2 * breathing <= available ? (available - height) / 2 : breathing;
    window.scrollTo({ top: window.scrollY + top - topbar - offset, behavior: 'instant' });
    section.focus({ preventScroll: true });
  }
}
