import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ContactService } from '../../core/services/contact.service';
import { OPERATORS } from '../../features/operators/operators';
import { FitLineDirective } from '../../shared/fit-line/fit-line.directive';

/**
 * Ficha de un operador asociado. Cada operador tiene su propia ruta (ver app.routes.ts), así que la
 * página se crea de nuevo al pasar de uno a otro y basta con leer el operador una vez.
 */
@Component({
  selector: 'app-operator-page',
  standalone: true,
  imports: [FitLineDirective, RouterLink],
  templateUrl: './operator-page.component.html',
  styleUrls: ['../../shared/secondary-page/secondary-page.css', './operator-page.component.css'],
})
export class OperatorPageComponent {
  private readonly contactService = inject(ContactService);
  private readonly slug = inject(ActivatedRoute).snapshot.data['operator'] as string;

  readonly operators = OPERATORS;
  readonly operator = OPERATORS.find(({ slug }) => slug === this.slug) ?? OPERATORS[0];

  /** Las solicitudes llegan al operador a través de la oficina de atención de AlienMilk. */
  readonly inquiryHref = computed(
    () =>
      `mailto:${this.contactService.contacto()?.email ?? ''}?subject=${encodeURIComponent(this.operator.service.subject)}`,
  );

  constructor() {
    this.contactService.load();
  }
}
