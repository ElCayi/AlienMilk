import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SpecimenCultureComponent } from '../../features/about/specimen-culture.component';
import { FitBoxDirective } from '../../shared/fit-box/fit-box.directive';

/** Nosotros, vestida con el lenguaje visual del resto del sitio. */
@Component({
  selector: 'app-about-page',
  standalone: true,
  imports: [RouterLink, SpecimenCultureComponent, FitBoxDirective],
  templateUrl: './about-page.component.html',
  styleUrl: './about-page.component.css',
})
export class AboutPageComponent {
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
