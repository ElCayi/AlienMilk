import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  QueryList,
  ViewChildren,
  inject,
} from '@angular/core';

@Component({
  selector: 'app-cursor-companion',
  standalone: true,
  template: `
    <span #companion class="cursor-companion" aria-hidden="true"></span>
    <span #companion class="cursor-companion" aria-hidden="true"></span>
    <span #companion class="cursor-companion" aria-hidden="true"></span>
    <span #companion class="cursor-companion" aria-hidden="true"></span>
  `,
  styleUrl: './cursor-companion.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CursorCompanionComponent implements AfterViewInit, OnDestroy {
  @ViewChildren('companion') private companions!: QueryList<ElementRef<HTMLElement>>;

  private readonly zone = inject(NgZone);
  private frameId = 0;
  private targetX = 0;
  private targetY = 0;
  private currentX = 0;
  private currentY = 0;
  private started = false;
  private enabled = false;
  private pointerVisible = false;
  private activeCount = 1;
  private readonly arrivalProgress = [1, 0, 0, 0];
  private readonly arrivalOrigins = Array.from({ length: 4 }, () => ({ x: 0, y: 0 }));

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (event.pointerType !== 'mouse') return;

    const firstPointerMove = !this.started;
    this.targetX = event.clientX;
    this.targetY = event.clientY;

    if (!this.started) {
      this.currentX = this.targetX;
      this.currentY = this.targetY;
      this.started = true;
    }

    if (firstPointerMove) this.prepareArrivals(1, this.activeCount);

    this.pointerVisible = true;
    this.updateActiveCompanions();
  };

  private readonly handlePointerOut = (event: PointerEvent): void => {
    if (!event.relatedTarget) {
      this.pointerVisible = false;
      this.updateActiveCompanions();
    }
  };

  private readonly handleScroll = (): void => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollable > 0 ? window.scrollY / scrollable : 0;
    const nextCount = Math.min(4, 1 + Math.floor(progress * 4));

    if (nextCount === this.activeCount) return;

    if (nextCount > this.activeCount && this.pointerVisible) {
      this.prepareArrivals(this.activeCount, nextCount);
    } else if (nextCount < this.activeCount) {
      for (let index = nextCount; index < this.activeCount; index += 1) {
        this.arrivalProgress[index] = 0;
      }
    }

    this.activeCount = nextCount;
    this.updateActiveCompanions();
  };

  ngAfterViewInit(): void {
    this.enabled = window.matchMedia(
      '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)',
    ).matches;

    if (!this.enabled) return;

    this.zone.runOutsideAngular(() => {
      window.addEventListener('pointermove', this.handlePointerMove, { passive: true });
      window.addEventListener('pointerout', this.handlePointerOut, { passive: true });
      window.addEventListener('scroll', this.handleScroll, { passive: true });
      this.handleScroll();
      this.frameId = requestAnimationFrame(this.animate);
    });
  }

  ngOnDestroy(): void {
    if (!this.enabled) return;

    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerout', this.handlePointerOut);
    window.removeEventListener('scroll', this.handleScroll);
    cancelAnimationFrame(this.frameId);
  }

  private readonly animate = (time: number): void => {
    const deltaX = this.targetX - this.currentX;
    const deltaY = this.targetY - this.currentY;
    this.currentX += deltaX * 0.035;
    this.currentY += deltaY * 0.035;

    const directionalTilt = Math.max(-9, Math.min(9, deltaX * 0.22));

    this.companions.forEach((companion, index) => {
      const direction = index === 2 ? -1 : 1;
      const speed = [1, 0.82, 0.68, 0.55][index];
      const orbitAngle = time * 0.00075 * speed * direction + index * 1.65;
      const radiusX = 32 + index * 12;
      const radiusY = 23 + index * 8;
      const driftX = Math.cos(orbitAngle) * radiusX;
      const driftY = Math.sin(orbitAngle) * radiusY;
      const idleTilt = Math.cos(orbitAngle) * 5;
      const breathing = 0.97 + Math.sin(time * 0.0018 + index) * 0.035;
      const progress = this.arrivalProgress[index];
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const orbitX = this.currentX + driftX;
      const orbitY = this.currentY + driftY;
      const x = this.arrivalOrigins[index].x * (1 - easedProgress) + orbitX * easedProgress;
      const y = this.arrivalOrigins[index].y * (1 - easedProgress) + orbitY * easedProgress;

      if (index < this.activeCount && progress < 1 && this.pointerVisible) {
        this.arrivalProgress[index] = Math.min(1, progress + 0.006);
      }

      companion.nativeElement.style.transform =
        `translate3d(${x}px, ${y}px, 0) ` +
        `rotate(${directionalTilt + idleTilt}deg) scale(${breathing})`;
    });

    this.frameId = requestAnimationFrame(this.animate);
  };

  private updateActiveCompanions(): void {
    this.companions.forEach((companion, index) => {
      companion.nativeElement.classList.toggle(
        'is-visible',
        this.pointerVisible && index < this.activeCount,
      );
    });
  }

  private prepareArrivals(from: number, to: number): void {
    for (let index = from; index < to; index += 1) {
      const origins = [
        { x: this.currentX, y: this.currentY },
        { x: window.innerWidth + 40, y: Math.max(30, this.currentY - 70) },
        { x: -40, y: Math.min(window.innerHeight - 30, this.currentY + 55) },
        { x: Math.min(window.innerWidth - 30, this.currentX + 90), y: window.innerHeight + 40 },
      ];

      this.arrivalOrigins[index] = origins[index];
      this.arrivalProgress[index] = index === 0 ? 1 : 0;
    }
  }
}
