import {
  afterNextRender,
  Component,
  computed,
  effect,
  ElementRef,
  HostListener,
  inject,
  Injector,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { revealExpanded } from './reveal-row';

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

interface SavedFilter {
  nombre: string;
  valores: FilterValues;
}

/**
 * La barra de filtros de los paneles, al estilo de los CRM: una barra que busca mientras se escribe y,
 * con «Filtros», un panel con filtros listos a la izquierda (y los que guarde cada cual, en este
 * navegador) y los campos a la derecha. Todo se aplica al momento y el panel se queda abierto, para ir
 * sumando filtros mientras se ve la tabla detrás; «Listo» lo cierra. Lo activo se queda en la barra como
 * chips, cada uno con su ✕. Quien la usa guarda los valores y los lleva a la dirección.
 */
@Component({
  selector: 'app-filter-bar',
  standalone: true,
  imports: [FormsModule],
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

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly textInput = viewChild<ElementRef<HTMLInputElement>>('text');

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
        return { key: field.key, label: field.type === 'select' ? (option?.label ?? value) : `${field.label}: ${value}` };
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
    if (this.open()) {
      this.close();
    } else {
      this.saving.set(false);
      this.open.set(true);
      // Abierto cerca del final de la pantalla, la vista baja lo justo para enseñarlo entero (sin que la
      // barra se vaya bajo la cabecera fija).
      afterNextRender(
        () => {
          const panel = this.host.nativeElement.querySelector<HTMLElement>('.filter-panel');
          const bar = this.host.nativeElement.querySelector<HTMLElement>('.filter-bar');
          if (panel && bar) {
            revealExpanded(panel, bar);
          }
        },
        { injector: this.injector },
      );
    }
  }

  close(): void {
    this.open.set(false);
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

  /** Los guardados no se suman: son un filtro entero, que sustituye al que hubiera. */
  useSaved(values: FilterValues): void {
    this.valuesChange.emit({ ...this.defaults(), ...values });
  }

  removeChip(key: string): void {
    this.valuesChange.emit({ ...this.values(), [key]: this.defaults()[key] ?? '' });
  }

  clearAll(): void {
    this.valuesChange.emit({ ...this.defaults() });
    this.textInput()?.nativeElement.focus();
  }

  visibleFields(): FilterField[] {
    return this.fields().filter((field) => !field.showWhen || field.showWhen(this.values()));
  }

  /** Guarda el filtro del panel con un nombre, en este navegador. */
  saveDraft(): void {
    const nombre = this.saveName.trim();
    if (!nombre) {
      return;
    }
    const list = [...this.saved().filter((item) => item.nombre !== nombre), { nombre, valores: { ...this.values() } }];
    this.writeSaved(list);
    this.saveName = '';
    this.saving.set(false);
  }

  removeSaved(nombre: string): void {
    this.writeSaved(this.saved().filter((item) => item.nombre !== nombre));
  }

  /** Esc cierra; un clic fuera, también (sin aplicar lo que estuviera a medias). */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open()) {
      this.close();
      this.textInput()?.nativeElement.focus();
    }
  }

  @HostListener('document:pointerdown', ['$event'])
  onPointerDown(event: PointerEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  private readSaved(key: string): SavedFilter[] {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as SavedFilter[]) : [];
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
