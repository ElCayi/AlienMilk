import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { ContactService } from '../../core/services/contact.service';
import { describeSchedule } from '../../features/contact/opening-hours';

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

  readonly contacto = this.contactService.contacto;
  readonly schedule = computed(() => {
    const contacto = this.contacto();
    return contacto ? describeSchedule(contacto) : '';
  });

  constructor() {
    this.contactService.load();
  }

  /** Desde otra página el router ya sube arriba; desde la portada hay que hacerlo a mano. */
  goHome(event: Event): void {
    event.preventDefault();
    this.router.navigate(['/']).then(() => {
      this.document.defaultView?.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}
