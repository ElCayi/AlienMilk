import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';

export interface CategoryOption {
  value: string;
  label: string;
}

let nextId = 0;

/** Desplegable propio: el nativo pinta la lista del sistema operativo, ajena al resto del sitio. */
@Component({
  selector: 'app-category-select',
  standalone: true,
  templateUrl: './category-select.component.html',
  styleUrl: './category-select.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategorySelectComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly list = viewChild<ElementRef<HTMLElement>>('list');

  readonly label = input.required<string>();
  readonly options = input.required<CategoryOption[]>();
  readonly value = model.required<string>();

  readonly id = `category-select-${nextId++}`;
  readonly open = signal(false);
  /** Opción marcada con el teclado mientras la lista está abierta. */
  readonly active = signal(0);

  readonly current = computed(
    () => this.options().find((option) => option.value === this.value()) ?? this.options()[0],
  );

  toggle(): void {
    if (this.open()) {
      this.close();
    } else {
      this.show();
    }
  }

  choose(option: CategoryOption): void {
    this.value.set(option.value);
    this.close();
    this.trigger().nativeElement.focus();
  }

  onTriggerKey(event: KeyboardEvent): void {
    if (!this.open() && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      this.show();
    }
  }

  /** Flechas, Inicio, Fin, Intro y Escape, como en un listbox. */
  onListKey(event: KeyboardEvent): void {
    const last = this.options().length - 1;
    const moves: Record<string, number> = {
      ArrowDown: Math.min(this.active() + 1, last),
      ArrowUp: Math.max(this.active() - 1, 0),
      Home: 0,
      End: last,
    };

    if (event.key in moves) {
      event.preventDefault();
      this.active.set(moves[event.key]);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.choose(this.options()[this.active()]);
    } else if (event.key === 'Escape' || event.key === 'Tab') {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.trigger().nativeElement.focus();
      }
      this.close();
    }
  }

  @HostListener('document:pointerdown', ['$event'])
  closeOutside(event: PointerEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  private show(): void {
    const index = this.options().findIndex((option) => option.value === this.value());
    this.active.set(Math.max(index, 0));
    this.open.set(true);
    // La lista aparece en el siguiente pintado; entonces recibe el foco.
    requestAnimationFrame(() => this.list()?.nativeElement.focus());
  }

  private close(): void {
    this.open.set(false);
  }
}
