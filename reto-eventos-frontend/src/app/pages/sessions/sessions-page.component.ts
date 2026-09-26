import { CommonModule, DOCUMENT } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  HostListener,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, map, of, Subject, switchMap } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { EventService } from '../../core/services/event.service';
import { ReservationService } from '../../core/services/reservation.service';
import { SessionDossierService } from '../../core/services/session-dossier.service';
import {
  humanizeSessionType,
  longSessionDate,
  sessionDuration,
  sessionPrice,
  shortSessionDate,
} from '../../features/sessions/session-dossier';
import { archiveCode, compatibility, sampleCode, sessionImage } from '../../features/sessions/session.presenter';
import { filterSessions } from '../../features/sessions/session-search';
import { EventoDetalle, EventoListado } from '../../models/api.models';
import { SessionDossier } from '../../models/session-dossier.models';

type DossierTab = 'expediente' | 'cata' | 'programa' | 'acceso' | 'equipo' | 'preguntas';

interface OpenedSession {
  detail: EventoDetalle;
  dossier: SessionDossier;
}

@Component({
  selector: 'app-sessions-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './sessions-page.component.html',
  styleUrl: './sessions-page.component.css',
})
export class SessionsPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly eventService = inject(EventService);
  private readonly dossierService = inject(SessionDossierService);
  private readonly reservationService = inject(ReservationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly requestedSession = new Subject<number>();
  private pendingReveal = false;
  private readonly indexTrack = viewChild<ElementRef<HTMLElement>>('indexTrack');
  private readonly fileAnchor = viewChild<ElementRef<HTMLElement>>('fileAnchor');
  readonly authService = inject(AuthService);

  readonly sessions = signal<EventoListado[]>([]);
  readonly opened = signal<OpenedSession | null>(null);
  readonly selectedId = signal<number | null>(null);
  readonly query = signal('');
  readonly category = signal('todas');
  readonly loadingSessions = signal(true);
  readonly loadingDetail = signal(false);
  readonly loadingReservation = signal(false);
  readonly imageExpanded = signal(false);
  readonly activeTab = signal<DossierTab>('expediente');
  readonly listError = signal('');
  readonly detailError = signal('');
  readonly reservationFeedback = signal('');
  readonly shareFeedback = signal('');
  readonly indexOverflows = signal(false);

  cantidad = 1;
  observaciones = '';

  readonly categories = computed(() =>
    [...new Set(this.sessions().map((session) => session.tipoEvento))].sort(),
  );

  readonly filteredSessions = computed(() =>
    filterSessions(this.sessions(), this.query(), this.category()),
  );

  /** El paginador recorre el índice visible; si la sesión abierta quedó fuera del filtro, el ciclo entero. */
  private readonly navigableSessions = computed(() => {
    const visible = this.filteredSessions();
    return visible.some((session) => session.idEvento === this.selectedId())
      ? visible
      : this.sessions();
  });

  /** Solo aparecen las pestañas cuyo contenido existe en el expediente abierto. */
  readonly tabs = computed(() => {
    const dossier = this.opened()?.dossier;
    if (!dossier) {
      return [];
    }

    const tabs: { id: DossierTab; label: string; visible: boolean }[] = [
      { id: 'expediente', label: 'Expediente', visible: true },
      { id: 'cata', label: 'Notas de cata', visible: dossier.notasCata.length > 0 },
      { id: 'programa', label: 'Desarrollo', visible: dossier.programa.length > 0 },
      { id: 'acceso', label: 'Acceso', visible: dossier.acceso.length > 0 },
      { id: 'equipo', label: 'Equipo', visible: dossier.equipo.length > 0 },
      { id: 'preguntas', label: 'Preguntas', visible: dossier.preguntas.length > 0 },
    ];
    return tabs.filter((tab) => tab.visible);
  });

  readonly openedView = computed(() => {
    const opened = this.opened();
    return opened ? [opened] : [];
  });

  readonly previousSession = computed(() => this.neighbour(-1));
  readonly nextSession = computed(() => this.neighbour(1));

  readonly currentUrl = computed(() => {
    const tree = this.router.createUrlTree(['/sesiones'], {
      queryParams: { q: this.query() || null, sesion: this.selectedId() },
    });
    return this.router.serializeUrl(tree);
  });

  readonly sessionImage = sessionImage;
  readonly archiveCode = archiveCode;
  readonly sampleCode = sampleCode;
  readonly compatibility = compatibility;
  readonly longDate = longSessionDate;
  readonly shortDate = shortSessionDate;
  readonly price = sessionPrice;
  readonly duration = sessionDuration;
  readonly typeLabel = humanizeSessionType;

  constructor() {
    // Las flechas del índice solo aparecen si alguna sesión queda fuera de la vista.
    effect((onCleanup) => {
      const track = this.indexTrack()?.nativeElement;
      if (!track) {
        return;
      }

      const measure = () => this.indexOverflows.set(track.scrollWidth > track.clientWidth + 1);
      const resize = new ResizeObserver(measure);
      const mutation = new MutationObserver(measure);
      resize.observe(track);
      mutation.observe(track, { childList: true });
      measure();
      onCleanup(() => {
        resize.disconnect();
        mutation.disconnect();
      });
    });
  }

  ngOnInit(): void {
    this.requestedSession
      .pipe(
        switchMap((idEvento) =>
          this.eventService.getDetalle(idEvento).pipe(
            switchMap((detail) =>
              this.dossierService.getDossier(detail).pipe(map((dossier) => ({ detail, dossier }))),
            ),
            catchError(() => of(null)),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((opened) => {
        this.loadingDetail.set(false);
        if (!opened) {
          this.detailError.set('El expediente solicitado no está disponible para consulta pública.');
          return;
        }

        this.opened.set(opened);
        if (this.pendingReveal) {
          this.pendingReveal = false;
          setTimeout(() => this.revealFile());
        }
        // Se conserva la pestaña al cambiar de sesión, salvo que la nueva no la tenga.
        if (!this.tabs().some((tab) => tab.id === this.activeTab())) {
          this.activeTab.set('expediente');
        }
      });

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.query.set(params.get('q') ?? '');
      const requestedId = Number(params.get('sesion'));
      const nextId = Number.isInteger(requestedId) && requestedId > 0 ? requestedId : null;
      if (nextId !== this.selectedId()) {
        this.selectedId.set(nextId);
        if (nextId) {
          this.openSession(nextId);
        }
      }
    });

    this.loadSessions();
  }

  loadSessions(): void {
    this.loadingSessions.set(true);
    this.listError.set('');
    this.eventService.getActivos().subscribe({
      next: (sessions) => {
        const ordered = [...sessions].sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio));
        this.sessions.set(ordered);
        this.loadingSessions.set(false);
        if (!this.selectedId() && ordered.length) {
          this.updateUrl({ sesion: ordered[0].idEvento }, true);
        }
      },
      error: () => {
        this.loadingSessions.set(false);
        this.listError.set('No hemos podido recuperar la programación autorizada.');
      },
    });
  }

  updateQuery(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    this.query.set(query);
    this.updateUrl({ q: query || null }, true);
  }

  updateCategory(event: Event): void {
    this.category.set((event.target as HTMLSelectElement).value);
  }

  selectSession(session: EventoListado): void {
    if (session.idEvento !== this.selectedId()) {
      this.updateUrl({ sesion: session.idEvento });
      // Al recrearse el expediente el navegador puede cortar el desplazamiento suave: se repite
      // cuando la sesión nueva ya está pintada.
      this.pendingReveal = true;
    }

    this.revealFile();
  }

  scrollIndex(direction: -1 | 1): void {
    const track = this.indexTrack()?.nativeElement;
    track?.scrollBy({ left: direction * track.clientWidth * 0.8, behavior: 'smooth' });
  }

  /** Flechas, Inicio y Fin recorren las pestañas, como en cualquier tablist. */
  moveTab(event: KeyboardEvent): void {
    const tabs = this.tabs();
    const index = tabs.findIndex((tab) => tab.id === this.activeTab());
    const targets: Record<string, number> = {
      ArrowRight: (index + 1) % tabs.length,
      ArrowLeft: (index - 1 + tabs.length) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    };
    const next = targets[event.key];
    if (next === undefined) {
      return;
    }

    event.preventDefault();
    this.activeTab.set(tabs[next].id);
    this.document.getElementById(`tab-${tabs[next].id}`)?.focus();
  }

  toggleImage(): void {
    this.imageExpanded.update((expanded) => !expanded);
  }

  @HostListener('document:keydown.escape')
  collapseImage(): void {
    this.imageExpanded.set(false);
  }

  async share(session: EventoDetalle): Promise<void> {
    const url = new URL(this.currentUrl(), this.document.baseURI).toString();
    const navigator = this.document.defaultView?.navigator;

    try {
      if (navigator?.share) {
        await navigator.share({ title: `${session.nombre} · AlienMilk Sessions`, url });
        return;
      }

      await navigator?.clipboard.writeText(url);
      this.shareFeedback.set('Enlace copiado');
    } catch {
      this.shareFeedback.set('');
      return;
    }

    setTimeout(() => this.shareFeedback.set(''), 2400);
  }

  reservar(): void {
    const detail = this.opened()?.detail;
    if (!detail || !this.authService.isAuthenticated()) {
      return;
    }

    this.loadingReservation.set(true);
    this.reservationFeedback.set('');
    this.reservationService.reservar(detail.idEvento, this.cantidad, this.observaciones).subscribe({
      next: () => {
        this.loadingReservation.set(false);
        this.router.navigateByUrl('/reservas');
      },
      error: (error) => {
        this.loadingReservation.set(false);
        this.reservationFeedback.set(
          error?.error?.message ?? 'No se ha podido completar la reserva de plaza.',
        );
      },
    });
  }

  totalReserva(): number {
    return (this.opened()?.detail.precio ?? 0) * Math.max(Number(this.cantidad) || 0, 0);
  }

  trackSession(_index: number, session: EventoListado): number {
    return session.idEvento;
  }

  trackOpened(_index: number, opened: OpenedSession): number {
    return opened.detail.idEvento;
  }

  private openSession(idEvento: number): void {
    // El expediente anterior sigue a la vista, atenuado, hasta que llega el nuevo.
    this.loadingDetail.set(true);
    this.detailError.set('');
    this.imageExpanded.set(false);
    this.cantidad = 1;
    this.observaciones = '';
    this.reservationFeedback.set('');
    this.shareFeedback.set('');
    this.requestedSession.next(idEvento);
  }

  private neighbour(offset: -1 | 1): EventoListado | null {
    const list = this.navigableSessions();
    const index = list.findIndex((session) => session.idEvento === this.selectedId());
    if (index < 0 || list.length < 2) {
      return null;
    }

    return list[(index + offset + list.length) % list.length];
  }

  private revealFile(): void {
    const anchor = this.fileAnchor()?.nativeElement;
    const window = this.document.defaultView;
    if (!anchor || !window) {
      return;
    }

    // Elegir una sesión siempre encuadra su imagen de portada bajo la barra superior, se esté donde
    // se esté de la página.
    const offset = parseFloat(window.getComputedStyle(anchor).scrollMarginTop) || 0;
    const target = window.scrollY + anchor.getBoundingClientRect().top - offset;
    if (Math.abs(target - window.scrollY) > 2) {
      window.scrollTo({ top: target, behavior: 'smooth' });
    }
  }

  private updateUrl(queryParams: Record<string, string | number | null>, replaceUrl = false): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl,
      // Cambiar de expediente no es cambiar de página: el desplazamiento lo decide revealFile().
      scroll: 'manual',
    });
  }
}
