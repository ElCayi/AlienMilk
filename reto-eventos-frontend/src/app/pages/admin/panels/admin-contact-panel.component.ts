import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ContactService } from '../../../core/services/contact.service';
import {
  DIAS,
  describeSchedule,
  formatHour,
  siteStatus,
} from '../../../features/contact/opening-hours';
import { Contacto, ContactoPayload } from '../../../models/api.models';
import { formatDayTime } from '../../../shared/panel/panel-format';
import { SectionHelpComponent } from '../../../shared/panel/section-help.component';

/** Formulario de la ficha de contacto: edita la única fila de la sede y enseña cómo quedará. */
@Component({
  selector: 'app-admin-contact-panel',
  standalone: true,
  imports: [SectionHelpComponent, FormsModule],
  templateUrl: './admin-contact-panel.component.html',
  styleUrls: ['../../../shared/panel/panel.css', './admin-contact-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminContactPanelComponent {
  private readonly contactService = inject(ContactService);

  readonly days = [1, 2, 3, 4, 5, 6, 7].map((dia) => ({
    dia,
    corto: DIAS[dia].slice(0, 3),
    nombre: DIAS[dia],
  }));
  readonly timeZones = supportedTimeZones();
  readonly when = formatDayTime;

  readonly saved = this.contactService.contacto;
  readonly loadError = this.contactService.error;
  readonly form = signal<ContactoPayload | null>(null);
  readonly saving = signal(false);
  readonly feedback = signal<{ text: string; error: boolean } | null>(null);

  readonly schedulePreview = computed(() => {
    const form = this.form();
    return form && form.diasApertura.length ? describeSchedule(form) : 'Sin días de apertura';
  });

  readonly statusPreview = computed(() => {
    const form = this.form();
    return form && form.diasApertura.length && form.horaApertura && form.horaCierre
      ? siteStatus(form, new Date())
      : null;
  });

  readonly dirty = computed(() => {
    const form = this.form();
    const saved = this.saved();
    return !!form && !!saved && JSON.stringify(form) !== JSON.stringify(toPayload(saved));
  });

  constructor() {
    this.contactService.load(true);

    // Rellena el formulario cuando llega la ficha, sin pisar lo que se esté escribiendo.
    effect(() => {
      const saved = this.saved();
      if (saved && !this.form()) {
        this.form.set(toPayload(saved));
      }
    });
  }

  update<K extends keyof ContactoPayload>(campo: K, valor: ContactoPayload[K]): void {
    this.form.update((form) => (form ? { ...form, [campo]: valor } : form));
    this.feedback.set(null);
  }

  toggleDay(dia: number, marcado: boolean): void {
    const dias = this.form()?.diasApertura ?? [];
    const siguientes = marcado ? [...dias, dia] : dias.filter((d) => d !== dia);
    this.update(
      'diasApertura',
      [...new Set(siguientes)].sort((a, b) => a - b),
    );
  }

  discard(): void {
    const saved = this.saved();
    if (saved) {
      this.form.set(toPayload(saved));
    }
    this.feedback.set(null);
  }

  save(): void {
    const form = this.form();
    if (!form) {
      return;
    }
    if (!form.diasApertura.length) {
      this.feedback.set({ text: 'Selecciona al menos un día de apertura.', error: true });
      return;
    }

    this.saving.set(true);
    this.contactService.update(form).subscribe({
      next: (contacto) => {
        this.form.set(toPayload(contacto));
        this.feedback.set({ text: 'Ficha de contacto actualizada.', error: false });
        this.saving.set(false);
      },
      error: (err) => {
        const message = (err as { error?: { message?: string } }).error?.message;
        this.feedback.set({ text: message ?? 'No se ha podido guardar la ficha.', error: true });
        this.saving.set(false);
      },
    });
  }

  retry(): void {
    this.contactService.load(true);
  }
}

function toPayload(contacto: Contacto): ContactoPayload {
  return {
    nombreSede: contacto.nombreSede,
    direccion: contacto.direccion,
    calle: contacto.calle ?? '',
    codigoPostal: contacto.codigoPostal ?? '',
    ciudad: contacto.ciudad,
    email: contacto.email,
    telefono: contacto.telefono ?? '',
    diasApertura: [...contacto.diasApertura],
    horaApertura: formatHour(contacto.horaApertura),
    horaCierre: formatHour(contacto.horaCierre),
    zonaHoraria: contacto.zonaHoraria,
    comoLlegar: contacto.comoLlegar ?? '',
    condicionesAcceso: contacto.condicionesAcceso ?? '',
  };
}

function supportedTimeZones(): string[] {
  const intl = Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] };
  return intl.supportedValuesOf?.('timeZone') ?? ['Europe/Madrid'];
}
