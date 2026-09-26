import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { ContactService } from '../../core/services/contact.service';
import { describeSchedule, siteStatus } from '../../features/contact/opening-hours';

/**
 * Pie común de la web. No deja margen propio: cada página decide cómo termina su último bloque,
 * y el pie se apoya directamente debajo.
 */
@Component({
  selector: 'app-site-footer',
  standalone: true,
  imports: [RouterLink],
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
  readonly schedule = computed(() => {
    const contacto = this.contacto();
    return contacto ? describeSchedule(contacto) : '';
  });
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
}
