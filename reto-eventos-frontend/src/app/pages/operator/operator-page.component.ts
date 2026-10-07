import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { OPERATORS } from '../../features/operators/operators';
import { FitLineDirective } from '../../shared/fit-line/fit-line.directive';
import { RequestDialogComponent } from '../../shared/request-dialog/request-dialog.component';

/**
 * Ficha de un operador asociado. Cada operador tiene su propia ruta (ver app.routes.ts), así que la
 * página se crea de nuevo al pasar de uno a otro y basta con leer el operador una vez.
 */
@Component({
  selector: 'app-operator-page',
  standalone: true,
  imports: [FitLineDirective, RequestDialogComponent, RouterLink],
  templateUrl: './operator-page.component.html',
  styleUrls: ['../../shared/secondary-page/secondary-page.css', './operator-page.component.css'],
})
export class OperatorPageComponent {
  private readonly slug = inject(ActivatedRoute).snapshot.data['operator'] as string;

  readonly operators = OPERATORS;
  readonly operator = OPERATORS.find(({ slug }) => slug === this.slug) ?? OPERATORS[0];

  /** Formulario del operador en el backend: resources/formularios/operador-<slug>.json. */
  readonly formKey = `operador-${this.operator.slug}`;
}
