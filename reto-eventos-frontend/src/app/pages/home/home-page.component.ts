import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { EventoListado } from '../../models/api.models';
import { EventService } from '../../core/services/event.service';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="hero" id="inicio">
      <video
        class="hero-video"
        autoplay
        muted
        loop
        playsinline
      >
        <source src="alienmilk-header-smoke-pingpong.mp4" type="video/mp4" />
      </video>
      <div class="hero-overlay" aria-hidden="true"></div>

      <p class="hero-intro hero-intro-desktop">
        AlienMilk Sessions es el programa de experiencias sensoriales de AlienMilk, dedicado a la
        cata de leches extraordinarias obtenidas en algunos de los lugares más remotos del universo.
      </p>

      <div class="hero-mobile-actions hero-icon-actions">
        <button type="button" aria-label="Compartir AlienMilk Sessions" title="Compartir" (click)="sharePage()">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="18" cy="5" r="2.4"></circle>
            <circle cx="6" cy="12" r="2.4"></circle>
            <circle cx="18" cy="19" r="2.4"></circle>
            <path d="m8.2 10.9 7.6-4.6M8.2 13.1l7.6 4.6"></path>
          </svg>
        </button>
        <button
          type="button"
          aria-label="Guardar como favorito"
          title="Favorito"
          [attr.aria-pressed]="isFavorite()"
          [class.is-favorite]="isFavorite()"
          (click)="toggleFavorite()"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.4 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"></path>
          </svg>
        </button>
        <span class="hero-action-feedback" *ngIf="actionFeedback()" aria-live="polite">
          {{ actionFeedback() }}
        </span>
      </div>

      <div class="hero-copy">
        <div class="hero-lockup">
          <img class="hero-lockup-logo" src="alienmilk-ufo.svg" alt="Logo AlienMilk Sessions" />
        </div>
        <div class="hero-brand-cta">
          <div class="hero-title">
            <h1>AlienMilk</h1>
            <span class="hero-subtitle" aria-label="Sessions">
              <span aria-hidden="true">S</span>
              <span aria-hidden="true">e</span>
              <span aria-hidden="true">s</span>
              <span aria-hidden="true">s</span>
              <span aria-hidden="true">i</span>
              <span aria-hidden="true">o</span>
              <span aria-hidden="true">n</span>
              <span aria-hidden="true">s</span>
            </span>
          </div>
          <p class="hero-intro hero-intro-mobile">
            AlienMilk Sessions es el programa de experiencias sensoriales de AlienMilk, dedicado a
            la cata de leches extraordinarias obtenidas en algunos de los lugares más remotos del universo.
          </p>
          <div class="hero-actions">
            <a class="dark-btn hero-button" routerLink="/registro">REGISTRATE</a>
            <a class="ghost-btn hero-button" routerLink="/" fragment="nosotros">CONOCENOS</a>
          </div>
        </div>
      </div>
    </section>
    <div class="hero-divider">
      <div class="hero-divider-actions hero-icon-actions">
        <button type="button" aria-label="Compartir AlienMilk Sessions" title="Compartir" (click)="sharePage()">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="18" cy="5" r="2.4"></circle>
            <circle cx="6" cy="12" r="2.4"></circle>
            <circle cx="18" cy="19" r="2.4"></circle>
            <path d="m8.2 10.9 7.6-4.6M8.2 13.1l7.6 4.6"></path>
          </svg>
        </button>
        <button
          type="button"
          aria-label="Guardar como favorito"
          title="Favorito"
          [attr.aria-pressed]="isFavorite()"
          [class.is-favorite]="isFavorite()"
          (click)="toggleFavorite()"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.4 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"></path>
          </svg>
        </button>
        <span class="hero-action-feedback" *ngIf="actionFeedback()" aria-live="polite">
          {{ actionFeedback() }}
        </span>
      </div>
    </div>

    <section class="section-block sessions-block" id="sesiones">
      <header class="sessions-editorial">
        <div>
          <p class="sessions-eyebrow">Programación / Ciclo 2026</p>
          <h2>Próximas<br />sesiones</h2>
        </div>
        <div class="sessions-editorial-copy">
          <p>
            Experiencias de degustación en torno a muestras lácteas de procedencia no documentada.
            <strong>El origen exacto del producto puede no ser revelado.</strong>
          </p>
          <a routerLink="/reservas">Ver programación completa <span aria-hidden="true">↗</span></a>
        </div>
      </header>

      <p class="sessions-status" *ngIf="loadingSessions()" role="status">
        Cargando sesiones disponibles...
      </p>

      <div class="sessions-status sessions-status-error" *ngIf="sessionsError()" role="alert">
        <p>{{ sessionsError() }}</p>
        <button type="button" (click)="loadSessions()">Volver a intentarlo</button>
      </div>

      <p class="sessions-status" *ngIf="!loadingSessions() && !sessionsError() && !sessions().length">
        Ahora mismo no hay sesiones disponibles. Vuelve pronto para descubrir las siguientes.
      </p>

      <div class="sessions-program" *ngIf="!loadingSessions() && !sessionsError() && featuredSession() as featured">
        <article class="session-featured">
          <a class="session-image-link" [routerLink]="['/eventos', featured.idEvento]">
            <img [src]="sessionImage(featured)" [alt]="'Sesión ' + featured.nombre" />
            <span>{{ featured.tipoEvento }}</span>
          </a>
          <div class="session-featured-info">
            <div class="session-file-heading">
              <span>{{ archiveCode(featured) }}</span>
              <span>{{ featured.tipoEvento }}</span>
            </div>
            <h3>{{ featured.nombre }}</h3>
            <dl class="session-file-data">
              <div><dt>Muestra</dt><dd>{{ sampleCode(featured) }}</dd></div>
              <div><dt>Procedencia</dt><dd>No declarada</dd></div>
              <div><dt>Fecha</dt><dd>{{ featured.fechaInicio | date: 'dd.MM.yy' }}</dd></div>
              <div><dt>Compatibilidad</dt><dd>{{ compatibility(featured) }}</dd></div>
            </dl>
            <div class="session-featured-footer">
              <span>{{ featured.precio | currency: 'EUR' }}</span>
              <a [routerLink]="['/eventos', featured.idEvento]">Examinar sesión <span aria-hidden="true">→</span></a>
            </div>
          </div>
        </article>

        <div class="session-secondary-list">
          <article class="session-secondary" *ngFor="let session of secondarySessions(); trackBy: trackSession">
            <a class="session-secondary-image" [routerLink]="['/eventos', session.idEvento]">
              <img [src]="sessionImage(session)" [alt]="'Sesión ' + session.nombre" />
              <span>{{ archiveCode(session) }}</span>
            </a>
            <div>
              <p>{{ session.tipoEvento }}</p>
              <h3>{{ session.nombre }}</h3>
              <span class="session-anomaly">{{ anomaly(session) }}</span>
              <footer>
                <span>{{ session.fechaInicio | date: 'dd.MM.yy' }} · {{ session.precio | currency: 'EUR' }}</span>
                <a [routerLink]="['/eventos', session.idEvento]" [attr.aria-label]="'Examinar ' + session.nombre">→</a>
              </footer>
            </div>
          </article>
        </div>
      </div>

      <a class="sessions-explore" routerLink="/reservas">
        Explorar todas las sesiones <span aria-hidden="true">→</span>
      </a>
    </section>

    <section class="section-block about-card" id="nosotros">
      <div class="about-layout">
        <div class="about-content">
          <h2>¡Disfruta de la leche!</h2>
          <p class="about-kicker">Fria, densa y luminosa.</p>
          <p class="about-copy">
            Una calma extraña que recorre el pecho, como si el tiempo se doblara un segundo antes
            de tragar. No sabe a leche. Sabe a purita.
          </p>
          <a class="dark-btn about-cta" routerLink="/login">Descubre mas</a>
        </div>

        <div class="about-gallery" aria-hidden="true">
          <div class="about-image about-image-main"></div>
          <div class="about-image about-image-offset"></div>
        </div>
      </div>
    </section>

    <section class="section-block contact-card" id="contacto">
      <div class="section-header">
        <div>
          <h2>Contacto</h2>
          <span class="helper">Puedes encontrarnos en la base central de AlienMilk Sessions.</span>
        </div>
      </div>

      <div class="contact-grid">
        <div>
          <span class="contact-label">Direccion</span>
          <strong>Hangar 7, Cupula Central, Madrid</strong>
        </div>
        <div>
          <span class="contact-label">Horario</span>
          <strong>Jueves a domingo · 18:00 a 23:30</strong>
        </div>
        <div>
          <span class="contact-label">Canal</span>
          <strong>contacto@alienmilksessions.com</strong>
        </div>
      </div>
    </section>
  `,
  styles: `
    .hero,
    .section-block {
      margin-bottom: 3.2rem;
    }

    .sessions-block {
      margin-bottom: 9.4rem;
    }

    .hero-divider {
      display: none;
    }

    .hero-divider-actions {
      position: relative;
      height: 100%;
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 1.15rem;
      padding: 0 3.98rem;
      transform: translateY(-0.64rem);
    }

    .hero-mobile-actions {
      display: none;
    }

    .hero-action-feedback {
      position: absolute;
      top: 50%;
      right: 9.4rem;
      padding: 0.42rem 0.75rem;
      border-radius: 999px;
      color: #faf9f7;
      background: #1f2430;
      box-shadow: 0 6px 18px rgba(31, 36, 48, 0.18);
      font-size: 0.72rem;
      line-height: 1.2;
      white-space: nowrap;
      transform: translateY(-50%);
    }

    .hero-icon-actions button {
      width: 2rem;
      height: 2rem;
      display: grid;
      place-items: center;
      padding: 0;
      border: 0;
      color: #1f2430;
      background: transparent;
      cursor: pointer;
    }

    .hero-icon-actions svg {
      width: 1.65rem;
      height: 1.65rem;
      overflow: visible;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .hero-icon-actions button:hover,
    .hero-icon-actions button:focus-visible,
    .hero-icon-actions .is-favorite {
      color: #d97706;
    }

    .hero-icon-actions button:focus-visible {
      outline: 2px solid currentColor;
      outline-offset: 3px;
      border-radius: 50%;
    }

    .hero-icon-actions .is-favorite svg {
      fill: currentColor;
    }

    .hero {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;
      align-items: center;
      min-height: 34rem;
      width: 100vw;
      margin-left: calc(50% - 50vw);
      margin-right: calc(50% - 50vw);
      padding: 4.25rem clamp(2rem, 6vw, 5rem);
      background: transparent;
      position: relative;
      overflow: hidden;
      margin-bottom: 7.8rem;
    }

    .hero > *:not(.hero-video):not(.hero-overlay):not(.hero-intro):not(.hero-mobile-actions) {
      position: relative;
      z-index: 1;
    }

    .hero-video {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center bottom;
      opacity: 1;
      pointer-events: none;
      transform: scaleY(-1) scale(1.14);
    }

    .hero-overlay {
      position: absolute;
      inset: 0;
      background: transparent;
      pointer-events: none;
    }

    .hero-intro {
      position: absolute;
      top: clamp(0.7rem, 1.5vh, 1.15rem);
      right: auto;
      left: 4.4rem;
      width: min(38vw, 39rem);
      margin: 0;
      color: #faf9f7;
      font-size: clamp(0.76rem, 0.8vw, 0.9rem);
      line-height: 1.65;
      text-align: left;
    }

    .hero-intro-mobile {
      display: none;
    }

    .hero-copy {
      width: min(100%, 54rem);
      justify-self: center;
      text-align: center;
      display: grid;
      gap: 1.35rem;
    }

    .hero-lockup {
      display: flex;
      justify-content: center;
      margin-bottom: 0.2rem;
    }

    .hero-lockup-logo {
      width: 8.4rem;
      height: 8.4rem;
      display: block;
      flex: 0 0 auto;
    }

    .hero-title {
      display: grid;
      justify-items: center;
      justify-self: center;
      width: fit-content;
      gap: 0.35rem;
    }

    .hero-brand-cta {
      display: grid;
      justify-items: center;
      justify-self: center;
      gap: 2.25rem;
    }

    h1 {
      font-family: 'Nunito', sans-serif;
      font-size: clamp(3rem, 7vw, 5.6rem);
      line-height: 0.98;
      margin: 0;
      font-weight: 900;
      letter-spacing: 0.02em;
      color: #1f2430;
    }

    .hero-subtitle {
      width: 100%;
      display: flex;
      justify-content: space-between;
      font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
      font-size: clamp(2.1rem, 4.75vw, 3.8rem);
      font-weight: 300;
      line-height: 0.85;
      color: #1f2430;
      transform: scaleY(0.78);
      transform-origin: center;
    }

    .hero-actions {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .hero-button {
      min-width: 10rem;
      font-size: 0.95rem;
      letter-spacing: 0.02em;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1.4rem;
      margin-bottom: 1.8rem;
    }

    .helper {
      color: #64748b;
      font-weight: 500;
    }

    .sessions-editorial {
      display: grid;
      grid-template-columns: minmax(0, 1.15fr) minmax(18rem, 0.85fr);
      align-items: end;
      gap: clamp(2rem, 7vw, 7rem);
      margin-bottom: 3.5rem;
      padding-top: 1.25rem;
      border-top: 1px solid rgba(31, 36, 48, 0.35);
    }

    .sessions-eyebrow {
      margin: 0 0 1.4rem;
      color: #d97706;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }

    .sessions-editorial h2 {
      margin: 0;
      color: #1f2430;
      font-family: 'Nunito', sans-serif;
      font-size: clamp(3.4rem, 7.5vw, 6.8rem);
      font-weight: 800;
      line-height: 0.83;
      letter-spacing: -0.055em;
      text-transform: uppercase;
    }

    .sessions-editorial-copy {
      display: grid;
      gap: 1.4rem;
      padding-bottom: 0.2rem;
    }

    .sessions-editorial-copy p {
      margin: 0;
      color: #475569;
      font-size: 0.95rem;
      line-height: 1.7;
    }

    .sessions-editorial-copy strong {
      display: block;
      margin-top: 0.35rem;
      color: #1f2430;
    }

    .sessions-editorial-copy a,
    .sessions-explore {
      color: #1f2430;
      font-size: 0.78rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-decoration: none;
      text-transform: uppercase;
    }

    .sessions-status {
      margin: 0;
      padding: 2rem;
      border: 1px solid rgba(31, 36, 48, 0.12);
      border-radius: 18px;
      color: #475569;
      text-align: center;
      background: rgba(255, 255, 255, 0.45);
    }

    .sessions-status-error {
      display: grid;
      justify-items: center;
      gap: 1rem;
    }

    .sessions-status-error p {
      margin: 0;
    }

    .sessions-status-error button {
      border: 1px solid #1f2430;
      border-radius: 999px;
      padding: 0.7rem 1.15rem;
      color: #1f2430;
      background: transparent;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }

    .contact-card {
      padding: 1.9rem;
      border-radius: 24px;
      background: rgba(255, 255, 255, 0.88);
      border: 1px solid rgba(23, 32, 51, 0.08);
      box-shadow: 0 16px 28px rgba(23, 32, 51, 0.06);
    }

    .about-card {
      padding: clamp(2rem, 5vw, 3.4rem);
      border-radius: 0;
      background: #d9dee5;
      border: 0;
      box-shadow: none;
      width: 100vw;
      margin-left: calc(50% - 50vw);
      margin-right: calc(50% - 50vw);
    }

    .about-layout {
      width: min(1240px, calc(100% - 3rem));
      margin: 0 auto;
      display: grid;
      grid-template-columns: minmax(0, 1.1fr) minmax(300px, 0.9fr);
      align-items: center;
      gap: clamp(2.2rem, 5vw, 5rem);
    }

    .about-content {
      display: grid;
      gap: 1rem;
      max-width: 44rem;
    }

    .about-content h2 {
      margin: 0;
      font-family: 'Nunito', sans-serif;
      font-size: clamp(2.35rem, 4.2vw, 3.45rem);
      line-height: 1.02;
      font-weight: 700;
      color: #23272f;
    }

    .about-kicker {
      margin: 0;
      color: #2f3743;
      font-size: 1.08rem;
      line-height: 1.62;
    }

    .about-copy {
      margin: -0.15rem 0 0;
      color: #2f3743;
      font-size: 1.08rem;
      line-height: 1.62;
      max-width: 42rem;
    }

    .about-cta {
      justify-self: start;
      min-width: 11rem;
    }

    .about-gallery {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1.2rem;
      align-items: start;
    }

    .about-image {
      width: 100%;
      height: 28rem;
      display: block;
      border-radius: 28px;
      background-image: url('/alienmilk-about-milk.png');
      background-repeat: no-repeat;
      background-size: 205% 100%;
      box-shadow: 0 20px 34px rgba(15, 23, 42, 0.14);
    }

    .about-image-main {
      margin-top: -1.2rem;
      background-position: left center;
    }

    .about-image-offset {
      margin-top: 1.8rem;
      background-position: right center;
    }

    .contact-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.25rem;
    }

    .contact-grid div {
      display: grid;
      gap: 0.55rem;
      padding: 1.2rem;
      border-radius: 18px;
      background: #f8fafc;
    }

    .contact-label {
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #64748b;
      font-weight: 800;
    }

    .sessions-program {
      display: grid;
      grid-template-columns: minmax(0, 1.55fr) minmax(18rem, 0.8fr);
      gap: 1.25rem;
    }

    .session-featured,
    .session-secondary {
      overflow: hidden;
      background: #1f2430;
    }

    .session-featured {
      display: grid;
      grid-template-rows: minmax(24rem, 1fr) auto;
    }

    .session-image-link,
    .session-secondary-image {
      position: relative;
      display: block;
      overflow: hidden;
    }

    .session-image-link img,
    .session-secondary-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      filter: saturate(0.72) contrast(1.06);
      transition: transform 400ms ease, filter 400ms ease;
    }

    .session-featured:hover img,
    .session-secondary:hover img {
      transform: scale(1.025);
      filter: saturate(0.95) contrast(1.06);
    }

    .session-image-link > span,
    .session-secondary-image > span {
      position: absolute;
      top: 1rem;
      left: 1rem;
      padding: 0.38rem 0.55rem;
      color: #faf9f7;
      background: rgba(31, 36, 48, 0.82);
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.11em;
      text-transform: uppercase;
    }

    .session-featured-info {
      display: grid;
      gap: 1.3rem;
      padding: clamp(1.4rem, 3vw, 2.25rem);
      color: #faf9f7;
    }

    .session-file-heading {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      color: #d97706;
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .session-featured h3,
    .session-secondary h3 {
      margin: 0;
      font-family: 'Nunito', sans-serif;
    }

    .session-featured h3 {
      max-width: 18ch;
      font-size: clamp(2rem, 4vw, 3.4rem);
      line-height: 0.98;
    }

    .session-file-data {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.65rem 2rem;
      margin: 0;
    }

    .session-file-data div {
      display: grid;
      grid-template-columns: 7rem 1fr;
      gap: 0.6rem;
      padding-top: 0.55rem;
      border-top: 1px solid rgba(250, 249, 247, 0.2);
    }

    .session-file-data dt,
    .session-file-data dd {
      margin: 0;
      font-size: 0.68rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .session-file-data dt {
      color: rgba(250, 249, 247, 0.55);
    }

    .session-featured-footer,
    .session-secondary footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }

    .session-featured-footer > span {
      font-size: 1.25rem;
      font-weight: 800;
    }

    .session-featured-footer a,
    .session-secondary a {
      color: #d97706;
      font-size: 0.75rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-decoration: none;
      text-transform: uppercase;
    }

    .session-secondary-list {
      display: grid;
      grid-template-rows: repeat(2, minmax(0, 1fr));
      gap: 1.25rem;
    }

    .session-secondary {
      display: grid;
      grid-template-rows: minmax(10rem, 1.15fr) auto;
    }

    .session-secondary > div {
      display: grid;
      gap: 0.65rem;
      padding: 1rem 1.15rem 1.1rem;
      color: #faf9f7;
    }

    .session-secondary p,
    .session-anomaly {
      margin: 0;
      color: #d97706;
      font-size: 0.62rem;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .session-secondary h3 {
      font-size: 1.25rem;
      line-height: 1.08;
    }

    .session-anomaly {
      color: rgba(250, 249, 247, 0.52);
    }

    .session-secondary footer > span {
      color: rgba(250, 249, 247, 0.72);
      font-size: 0.72rem;
    }

    .sessions-explore {
      width: fit-content;
      display: flex;
      gap: 0.8rem;
      margin: 2.75rem auto 0;
      padding-bottom: 0.45rem;
      border-bottom: 1px solid #1f2430;
    }

    @media (min-width: 1001px) {
      .hero-copy {
        transform: scale(1);
        transform-origin: center;
        transition: transform 180ms ease;
      }

      .hero-brand-cta {
        width: fit-content;
      }

      .hero-actions {
        width: 100%;
      }

      .hero-button {
        flex: 1 1 0;
      }
    }

    @media (min-width: 1200px) {
      .hero-copy {
        transform: scale(1.08);
      }
    }

    @media (min-width: 1500px) {
      .hero-copy {
        transform: scale(1.16);
      }
    }

    @media (min-width: 1800px) {
      .hero-copy {
        transform: scale(1.24);
      }
    }

    @media (min-width: 901px) {
      .hero {
        min-height: calc(100vh - (2 * var(--topbar-height)));
        min-height: calc(100dvh - (2 * var(--topbar-height)));
        margin-bottom: 0;
      }

      .hero-divider {
        display: block;
        width: 100vw;
        height: var(--topbar-height);
        margin-left: calc(50% - 50vw);
        margin-right: calc(50% - 50vw);
        margin-bottom: calc(7.8rem - var(--topbar-height));
      }
    }

    @media (max-width: 1000px) {
      .hero-actions .ghost-btn {
        background: rgba(255, 255, 255, 0.75);
        backdrop-filter: blur(6px);
      }

      .hero-actions .ghost-btn:hover {
        background: #d97706;
      }
    }

    @media (max-width: 900px) {
      .sessions-editorial,
      .sessions-program {
        grid-template-columns: 1fr;
      }

      .sessions-editorial {
        align-items: start;
        gap: 2rem;
        margin-bottom: 2.5rem;
      }

      .sessions-editorial h2 {
        font-size: clamp(3.2rem, 16vw, 5.4rem);
      }

      .sessions-editorial-copy {
        max-width: 34rem;
      }

      .session-featured {
        grid-template-rows: minmax(20rem, 58vh) auto;
      }

      .session-file-data {
        grid-template-columns: 1fr;
      }

      .session-secondary-list {
        grid-template-rows: none;
      }

      .session-secondary {
        grid-template-columns: minmax(8rem, 0.8fr) 1.2fr;
        grid-template-rows: minmax(14rem, auto);
      }

      .hero-mobile-actions {
        position: absolute;
        z-index: 2;
        top: 1.25rem;
        right: 1.4rem;
        display: flex;
        gap: 0.65rem;
      }

      .hero-mobile-actions button {
        border-radius: 50%;
      }

      .hero-mobile-actions .hero-action-feedback {
        top: calc(100% + 0.5rem);
        right: 0;
        transform: none;
      }

      .hero-intro-desktop {
        display: none;
      }

      .hero-intro-mobile {
        display: block;
        position: static;
        width: var(--mobile-brand-width);
        margin: -0.95rem auto 0;
        color: #1f2430;
        font-size: clamp(0.72rem, 3vw, 0.84rem);
        line-height: 1.55;
        text-align: left;
        transform: translateY(-5rem);
      }

      .hero {
        grid-template-columns: 1fr;
        min-height: calc(100svh - var(--topbar-height));
        min-height: calc(100dvh - var(--topbar-height));
        padding: 1.4rem;
        margin-bottom: 0;
      }

      .hero-divider {
        display: none;
      }

      .hero-copy {
        --mobile-brand-width: clamp(16rem, 67vw, 21.5rem);
        position: relative;
        align-self: stretch;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1.75rem;
      }

      .hero-brand-cta {
        display: contents;
      }

      .hero-lockup-logo {
        width: 9.5rem;
        height: 9.5rem;
      }

      .hero-lockup,
      .hero-title {
        transform: translateY(-5rem);
      }

      .hero-title {
        width: var(--mobile-brand-width);
        gap: 0.9rem;
      }

      .hero-title h1 {
        white-space: nowrap;
      }

      h1 {
        font-size: clamp(3.35rem, 14vw, 4.5rem);
      }

      .hero-subtitle {
        font-size: clamp(2.25rem, 9vw, 3rem);
      }

      .hero-actions {
        position: absolute;
        left: 50%;
        bottom: clamp(1.75rem, 4dvh, 2.75rem);
        width: min(100%, 22rem);
        gap: 1rem;
        flex-wrap: nowrap;
        transform: translateX(-50%);
      }

      .hero-button {
        min-width: 0;
        flex: 1 1 0;
      }

      .about-layout {
        grid-template-columns: 1fr;
        width: min(100%, calc(100% - 1rem));
      }

      .about-gallery {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .about-image {
        height: 20rem;
      }
    }
  `,
})
export class HomePageComponent implements OnInit {
  private readonly eventService = inject(EventService);
  private readonly sessionImages = [
    'alienmilk-session-red.jpg',
    'alienmilk-session-lab.jpg',
    'alienmilk-session-unnamed.jpg',
    'alienmilk-session-conejo-de-chocolate.jpg',
    'alienmilk-session-road.jpg',
    'alienmilk-session-road2.jpg',
  ];

  readonly sessions = signal<EventoListado[]>([]);
  readonly featuredSession = computed(() => this.sessions()[0] ?? null);
  readonly secondarySessions = computed(() => this.sessions().slice(1, 3));
  readonly loadingSessions = signal(true);
  readonly sessionsError = signal('');
  readonly isFavorite = signal(localStorage.getItem('alienmilk-favorite') === 'true');
  readonly actionFeedback = signal('');
  private feedbackTimer: number | undefined;

  ngOnInit(): void {
    this.loadSessions();
  }

  loadSessions(): void {
    this.loadingSessions.set(true);
    this.sessionsError.set('');

    this.eventService.getActivos().subscribe({
      next: (sessions) => {
        this.sessions.set(
          [...sessions].sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio)),
        );
        this.loadingSessions.set(false);
      },
      error: () => {
        this.sessions.set([]);
        this.sessionsError.set('No hemos podido cargar las sesiones disponibles.');
        this.loadingSessions.set(false);
      },
    });
  }

  trackSession(_index: number, session: EventoListado): number {
    return session.idEvento;
  }

  sessionImage(session: EventoListado): string {
    return this.sessionImages[Math.abs(session.idEvento) % this.sessionImages.length];
  }

  archiveCode(session: EventoListado): string {
    return `AM-S/${String(session.idEvento + 20).padStart(3, '0')}`;
  }

  sampleCode(session: EventoListado): string {
    return `CL-${String((session.idEvento * 7) % 100).padStart(2, '0')}`;
  }

  compatibility(session: EventoListado): string {
    return `${(96.8 + (session.idEvento % 9) / 10).toFixed(1).replace('.', ',')} %`;
  }

  anomaly(session: EventoListado): string {
    const anomalies = ['Procedencia no declarada', 'Extracción restringida', 'Frecuencia no catalogada'];
    return anomalies[session.idEvento % anomalies.length];
  }

  async sharePage(): Promise<void> {
    const shareData = {
      title: 'AlienMilk Sessions',
      text: 'Descubre las experiencias sensoriales de AlienMilk Sessions.',
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        this.showActionFeedback('Compartido');
      } catch (error) {
        if (error instanceof DOMException && error.name !== 'AbortError') {
          this.showActionFeedback('No se ha podido compartir');
        }
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(shareData.url);
      this.showActionFeedback('Enlace copiado');
    } catch {
      this.showActionFeedback('No se ha podido copiar el enlace');
    }
  }

  toggleFavorite(): void {
    const nextValue = !this.isFavorite();
    this.isFavorite.set(nextValue);
    localStorage.setItem('alienmilk-favorite', String(nextValue));
    this.showActionFeedback(nextValue ? 'Guardado en favoritos' : 'Eliminado de favoritos');
  }

  private showActionFeedback(message: string): void {
    this.actionFeedback.set(message);
    window.clearTimeout(this.feedbackTimer);
    this.feedbackTimer = window.setTimeout(() => this.actionFeedback.set(''), 2200);
  }
}
