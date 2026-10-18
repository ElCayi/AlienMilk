import { Component, computed, effect, ElementRef, input, output, signal, untracked, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { PanelDialogComponent } from './panel-dialog.component';

/** Los filtros, por su clave: '' es «cualquiera». Van tal cual a la dirección (?pago=taquilla…). */
export type FilterValues = Record<string, string>;

/** Un campo del panel: texto libre, una lista de opciones o una fecha. */
export interface FilterField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date';
  options?: { value: string; label: string }[];
  placeholder?: string;
  /** Solo se enseña cuando hace falta (las fechas «entre», por ejemplo). */
  showWhen?: (values: FilterValues) => boolean;
}

/** Un filtro listo: a la izquierda del panel, con cuántas coinciden. */
export interface FilterPreset {
  label: string;
  values: FilterValues;
  count?: number;
}

/** Los días como en la dirección y en la API (2026-11-20), en la hora de quien mira. */
export const isoDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

/** El campo de fecha de los paneles, con «Entre dos fechas» y sus dos campos, que solo salen entonces. */
export function dateFields(label: string): FilterField[] {
  return [
    {
      key: 'fecha',
      label,
      type: 'select',
      options: [
        { value: '', label: 'Cualquier fecha' },
        { value: 'hoy', label: 'Hoy' },
        { value: 'manana', label: 'Mañana' },
        { value: 'semana', label: 'Próximos 7 días' },
        { value: 'mes', label: 'Próximos 30 días' },
        { value: 'pasadas', label: 'Ya celebradas' },
        { value: 'rango', label: 'Entre dos fechas' },
      ],
    },
    { key: 'desde', label: 'Desde', type: 'date', showWhen: (values) => values['fecha'] === 'rango' },
    { key: 'hasta', label: 'Hasta', type: 'date', showWhen: (values) => values['fecha'] === 'rango' },
  ];
}

/** Si un día (2026-11-20) cae en lo que pide el campo de fecha (ver dateFields). */
export function matchesDate(day: string, values: FilterValues, today = new Date()): boolean {
  const hoy = isoDay(today);
  switch (values['fecha'] ?? '') {
    case 'hoy':
      return day === hoy;
    case 'manana':
      return day === isoDay(addDays(today, 1));
    case 'semana':
      return day >= hoy && day <= isoDay(addDays(today, 6));
    case 'mes':
      return day >= hoy && day <= isoDay(addDays(today, 30));
    case 'pasadas':
      return day < hoy;
    case 'rango':
      return (!values['desde'] || day >= values['desde']) && (!values['hasta'] || day <= values['hasta']);
    default:
      return true;
  }
}

interface SavedFilter {
  nombre: string;
  valores: FilterValues;
}

/**
 * La barra de filtros de los paneles, al estilo de los CRM: una barra que busca mientras se escribe y,
 * con «Filtros», un diálogo como los demás del panel, centrado y con el fondo oscurecido: los filtros
 * listos (y los que guarde cada cual, en este navegador) a la izquierda y los campos a la derecha. Todo se
 * aplica al momento, para ir sumando filtros; «Listo» lo cierra. Lo activo se queda en la barra como chips,
 * cada uno con su ✕. Quien la usa guarda los valores y los lleva a la dirección.
 */
@Component({
  selector: 'app-filter-bar',
  standalone: true,
  imports: [FormsModule, PanelDialogComponent],
  templateUrl: './filter-bar.component.html',
  styleUrls: ['./panel.css', './filter-bar.component.css'],
})
export class FilterBarComponent {
  readonly fields = input.required<FilterField[]>();
  readonly presets = input<FilterPreset[]>([]);
  readonly values = input.required<FilterValues>();
  /** Lo que vale «sin filtrar» en cada campo (el estado, por ejemplo, empieza en «vivas»). */
  readonly defaults = input<FilterValues>({});
  /** El campo de texto, el que se escribe en la barra. */
  readonly textKey = input('q');
  readonly placeholder = input('Filtrar y buscar');
  /** Dónde se guardan los filtros de cada cual (localStorage). */
  readonly storageKey = input.required<string>();
  readonly valuesChange = output<FilterValues>();

  private readonly textInput = viewChild<ElementRef<HTMLInputElement>>('text');
  private readonly dialog = viewChild.required<PanelDialogComponent>('dialog');

  readonly open = signal(false);
  readonly saved = signal<SavedFilter[]>([]);
  readonly saving = signal(false);
  saveName = '';

  readonly panelId = `filter-panel-${Math.random().toString(36).slice(2, 8)}`;

  /** Lo que está activo, como chips: cada campo que no está en su valor de «sin filtrar». */
  readonly chips = computed(() => {
    const values = this.values();
    const defaults = this.defaults();
    return this.fields()
      .filter((field) => field.key !== this.textKey())
      .filter((field) => (values[field.key] ?? '') !== (defaults[field.key] ?? ''))
      .filter((field) => !field.showWhen || field.showWhen(values))
      .map((field) => {
        const value = values[field.key] ?? '';
        const option = field.options?.find((item) => item.value === value);
        const shown = field.type === 'select' ? (option?.label ?? value) : field.type === 'date' ? shortDay(value) : value;
        return { key: field.key, label: field.type === 'select' ? shown : `${field.label}: ${shown}` };
      });
  });

  readonly active = computed(() => this.chips().length > 0 || !!this.values()[this.textKey()]);

  constructor() {
    effect(() => {
      const key = this.storageKey();
      untracked(() => this.saved.set(this.readSaved(key)));
    });
  }

  /** Escribir en la barra busca al momento, sin abrir nada. */
  setText(text: string): void {
    this.valuesChange.emit({ ...this.values(), [this.textKey()]: text });
  }

  toggle(): void {
    this.saving.set(false);
    this.saveName = '';
    // Los guardados pueden haber cambiado en otro panel que usa la misma lista (Sesiones y su lote).
    this.saved.set(this.readSaved(this.storageKey()));
    this.open.set(true);
    this.dialog().open();
  }

  close(): void {
    this.dialog().close();
  }

  /** El diálogo se ha cerrado (Listo, la ✕ o Esc): la barra vuelve a tener el foco. */
  onClosed(): void {
    this.open.set(false);
    this.saving.set(false);
    this.textInput()?.nativeElement.focus();
  }

  /** Un campo del panel, aplicado al momento. */
  setField(key: string, value: string): void {
    this.valuesChange.emit({ ...this.values(), [key]: value ?? '' });
  }

  /** Si un filtro listo está puesto: todo lo que pide coincide con lo que hay. */
  isActive(values: FilterValues): boolean {
    const current = this.values();
    return Object.entries(values).every(([key, value]) => (current[key] ?? '') === value);
  }

  /** Si un filtro guardado es exactamente lo que hay puesto. */
  isSavedActive(values: FilterValues): boolean {
    const full = { ...this.defaults(), ...values };
    const current = this.values();
    return this.fields().every((field) => (current[field.key] ?? '') === (full[field.key] ?? ''));
  }

  /**
   * Un filtro listo se suma a lo que ya hay (lo que pide en sus campos, lo demás se queda); si ya estaba,
   * pulsarlo lo quita.
   */
  usePreset(values: FilterValues): void {
    const current = this.values();
    if (this.isActive(values)) {
      const off = Object.fromEntries(Object.keys(values).map((key) => [key, this.defaults()[key] ?? '']));
      this.valuesChange.emit({ ...current, ...off });
    } else {
      this.valuesChange.emit({ ...current, ...values });
    }
  }

  /** Los guardados no se suman: son un filtro entero, que sustituye al que hubiera; pulsarlo otra vez lo quita. */
  useSaved(values: FilterValues): void {
    this.valuesChange.emit(this.isSavedActive(values) ? { ...this.defaults() } : { ...this.defaults(), ...values });
  }

  removeChip(key: string): void {
    this.valuesChange.emit({ ...this.values(), [key]: this.defaults()[key] ?? '' });
  }

  clearAll(): void {
    this.valuesChange.emit({ ...this.defaults() });
    if (!this.open()) {
      this.textInput()?.nativeElement.focus();
    }
  }

  visibleFields(): FilterField[] {
    return this.fields().filter((field) => !field.showWhen || field.showWhen(this.values()));
  }

  /** Lo que se guarda: solo los campos que no están en su valor de «sin filtrar». */
  private currentFilter(): FilterValues {
    const values = this.values();
    const defaults = this.defaults();
    return Object.fromEntries(
      this.fields()
        .map((field) => [field.key, values[field.key] ?? ''] as const)
        .filter(([key, value]) => value !== (defaults[key] ?? '')),
    );
  }

  /** Guarda el filtro puesto con un nombre, en este navegador; con un nombre que ya existe, lo sustituye. */
  saveDraft(): void {
    const nombre = this.saveName.trim();
    if (!nombre || !this.active()) {
      return;
    }
    const list = [...this.saved().filter((item) => item.nombre !== nombre), { nombre, valores: this.currentFilter() }];
    this.writeSaved(list);
    this.saveName = '';
    this.saving.set(false);
  }

  removeSaved(nombre: string): void {
    this.writeSaved(this.saved().filter((item) => item.nombre !== nombre));
  }

  private readSaved(key: string): SavedFilter[] {
    try {
      const raw = localStorage.getItem(key);
      const list = raw ? (JSON.parse(raw) as unknown) : [];
      return Array.isArray(list)
        ? list.filter((item): item is SavedFilter => !!item && typeof item.nombre === 'string' && !!item.valores)
        : [];
    } catch {
      return [];
    }
  }

  private writeSaved(list: SavedFilter[]): void {
    this.saved.set(list);
    try {
      localStorage.setItem(this.storageKey(), JSON.stringify(list));
    } catch {
      // Sin almacenamiento (modo privado estricto): el filtro vale mientras dure la página.
    }
  }
}

/** Un día de la dirección (2026-11-20) como se lee en un chip: 20 nov 2026. */
function shortDay(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return value;
  }
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
    .format(new Date(year, month - 1, day))
    .replace('.', '');
}
