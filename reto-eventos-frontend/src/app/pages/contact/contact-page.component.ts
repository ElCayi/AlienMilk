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

  /** Permite partir el correo en la arroba y no a mitad de palabra. */
  readonly emailParts = computed(() => {
    const email = this.contacto()?.email ?? '';
    const arroba = email.lastIndexOf('@');
    return [email.slice(0, arroba), email.slice(arroba + 1)];
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
}
