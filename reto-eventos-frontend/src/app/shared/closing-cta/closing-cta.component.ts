import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';

import { ScaleWidthDirective } from '../fit-box/scale-width.directive';

/**
 * Tarjeta oscura de cierre (Sesiones y la home): el texto a la izquierda y una imagen abajo a la
 * derecha. Cada página proyecta su título, texto, botones y nota con las clases de
 * closing-cta.component.css. Sin encapsular, porque esos estilos se aplican a lo proyectado; todos
 * van bajo .closing-cta.
 */
@Component({
  selector: 'app-closing-cta',
  standalone: true,
  imports: [ScaleWidthDirective],
  template: `
    <section
      class="closing-cta"
      [style.--closing-cta-image]="'url(' + image() + ')'"
      [attr.aria-labelledby]="labelledBy()"
      [appScaleWidth]="1094"
    >
      <div class="closing-cta-copy"><ng-content /></div>
    </section>
  `,
  styleUrl: './closing-cta.component.css',
  host: { style: 'display: block' },
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClosingCtaComponent {
  readonly image = input.required<string>();
  readonly labelledBy = input<string>();
}
