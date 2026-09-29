import { DatePipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ContactService } from '../../core/services/contact.service';
import { describeDays, formatHour, siteStatus } from '../../features/contact/opening-hours';

@Component({
  selector: 'app-contact-page',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './contact-page.component.html',
  styleUrl: './contact-page.component.css',
})
export class ContactPageComponent implements OnInit {
  private readonly contactService = inject(ContactService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly now = signal(new Date());

  readonly contacto = this.contactService.contacto;
  readonly error = this.contactService.error;

  readonly areas = [
    {
      number: '01',
      title: 'Reservas y sesiones',
      description: 'Una plaza, un cambio de planes o una duda sobre la experiencia que ha elegido.',
      preparation:
        'Indique la sesión, la fecha y la referencia de su reserva, si ya dispone de ella.',
      subject: 'Sessions · Consulta sobre una reserva',
    },
    {
      number: '02',
      title: 'Visitas y accesibilidad',
      description:
        'Prepare su llegada, consulte las condiciones del recorrido o solicite acompañamiento.',
      preparation:
        'Cuéntenos qué necesita y cuándo desea visitarnos. No adjunte documentación médica.',
      subject: 'Atención a visitantes · Preparación de la visita',
    },
    {
      number: '03',
      title: 'Grupos e instituciones',
      description:
        'Visitas de estudio, encuentros profesionales y propuestas para compartir una sesión.',
      preparation:
        'Incluya el número de participantes, las fechas previstas y el motivo de la visita.',
      subject: 'Relaciones institucionales · Visita de grupo',
    },
    {
      number: '04',
      title: 'Prensa, archivo e investigación',
      description:
        'Información editorial, consultas al catálogo y solicitudes de documentación o imágenes.',
      preparation:
        'Indique su medio o proyecto, el material que necesita y la fecha de publicación prevista.',
      subject: 'Comunicación y archivo · Solicitud de información',
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

  readonly mapUrl = computed(() => {
    const contacto = this.contacto();
    const query = contacto ? `${contacto.direccion}, ${contacto.ciudad}` : '';
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
    section.scrollIntoView({ behavior: 'instant', block: 'start' });
    section.focus({ preventScroll: true });
  }
}
