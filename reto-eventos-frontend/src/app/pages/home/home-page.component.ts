import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

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

      <div class="hero-copy">
        <div class="hero-lockup">
          <img class="hero-lockup-logo" src="alienmilk-ufo.svg" alt="Logo AlienMilk Sessions" />
        </div>
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
        <div class="hero-actions">
          <a class="dark-btn hero-button" routerLink="/registro">REGISTRATE</a>
          <a class="ghost-btn hero-button" routerLink="/" fragment="nosotros">CONOCENOS</a>
        </div>
      </div>
    </section>
    <div class="hero-divider" aria-hidden="true"></div>

    <section class="section-block sessions-block" id="sesiones">
      <div class="section-header">
        <div>
          <h2 class="section-brand">
            <img src="alienmilk-ufo.svg" alt="Logo AlienMilk Sessions" />
            <span class="section-brand-name">AlienMilk</span>
            <span class="section-brand-subtitle">Sessions</span>
          </h2>
          <p class="section-brand-copy">
            <strong>AlienMilk Sessions</strong> convierte cada origen en una <strong>experiencia</strong>.
            Degustaciones de leches procedentes de <strong>distintos mundos</strong>, donde aprenderas
            a reconocer su <strong>origen</strong>, entender su <strong>extraccion</strong> y explorar
            el <strong>universo AlienMilk</strong>.
          </p>
        </div>
      </div>

      <div class="section-grid">
        <article class="section-card">
          <img class="section-card-image" src="alienmilk-session-red.jpg" alt="Sesion AlienMilk en sala roja" />
          <span class="section-kicker">01</span>
          <h3>Cata de origenes galacticos</h3>
          <p>
            Prueba leches procedentes de distintos mundos y aprende a distinguir su origen,
            textura y notas principales.
          </p>
          <a routerLink="/login">Reservar sesion <span aria-hidden="true">&gt;</span></a>
        </article>

        <article class="section-card">
          <img class="section-card-image" src="alienmilk-session-lab.jpg" alt="Sesion AlienMilk en laboratorio" />
          <span class="section-kicker">02</span>
          <h3>Extraccion y laboratorio</h3>
          <p>
            Una sesion guiada para entender como se extrae, conserva y estudia cada muestra en el
            universo AlienMilk.
          </p>
          <a routerLink="/login">Reservar sesion <span aria-hidden="true">&gt;</span></a>
        </article>

        <article class="section-card">
          <img class="section-card-image" src="alienmilk-session-unnamed.jpg" alt="Sesion AlienMilk nocturna" />
          <span class="section-kicker">03</span>
          <h3>Maridaje de leches raras</h3>
          <p>
            Descubre combinaciones inesperadas y aprende a disfrutar cada variedad con una mirada
            mas sensorial y divertida.
          </p>
          <a routerLink="/login">Reservar sesion <span aria-hidden="true">&gt;</span></a>
        </article>
      </div>
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

    .hero > *:not(.hero-video):not(.hero-overlay) {
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
      margin-top: 0.9rem;
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

    .section-brand {
      display: inline-flex;
      align-items: center;
      gap: 0.7rem;
      margin: 0;
    }

    .section-brand img {
      width: 1.7rem;
      height: 1.7rem;
      display: block;
      flex: 0 0 auto;
    }

    .section-brand-name {
      font-family: 'Nunito', sans-serif;
      font-weight: 800;
      color: #20242b;
    }

    .section-brand-subtitle {
      font-family: 'Arial', Times, serif;
      font-size: 0.95rem;
      font-weight: 600;
      color: #20242b;
    }

    .section-brand-copy {
      margin: 1.15rem 0 0;
      max-width: 92ch;
      color: #475569;
      font-size: 1.18rem;
      line-height: 1.82;
    }

    .section-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.6rem;
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

    .section-card {
      display: grid;
      gap: 1.1rem;
      padding: 1rem 1rem 1.35rem;
      border-radius: 22px;
      background: rgba(24, 28, 36, 0.96);
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 20px 34px rgba(15, 23, 42, 0.18);
      transition:
        transform 180ms ease,
        box-shadow 180ms ease,
        border-color 180ms ease;
    }

    .section-card:hover {
      transform: translateY(-6px);
      border-color: rgba(217, 119, 6, 0.3);
      box-shadow: 0 26px 42px rgba(15, 23, 42, 0.28);
    }

    .section-card-image {
      width: 100%;
      aspect-ratio: 4 / 3;
      object-fit: cover;
      object-position: center;
      display: block;
      border-radius: 16px;
      transition:
        transform 220ms ease,
        filter 220ms ease;
    }

    .section-card:hover .section-card-image {
      transform: scale(1.03);
      filter: saturate(1.04);
    }

    .section-kicker {
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-size: 1rem;
      font-weight: 800;
      color: #d97706;
    }

    .section-card h3 {
      margin: 0;
      color: #f8fafc;
      font-family: 'Nunito', sans-serif;
      font-size: 1.5rem;
      line-height: 1.18;
    }

    .section-card p {
      margin: 0;
      color: rgba(241, 245, 249, 0.82);
      line-height: 1.82;
    }

    .section-card a {
      justify-self: start;
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      text-decoration: none;
      color: #d97706;
      font-weight: 700;
      transition:
        color 180ms ease,
        transform 180ms ease;
    }

    .section-card a span {
      transition: transform 180ms ease;
    }

    .section-card:hover a {
      transform: translateY(-1px);
    }

    .section-card:hover a span {
      transform: translateX(4px);
    }

    @media (min-width: 901px) {
      .hero {
        min-height: calc(100vh - (2 * var(--topbar-height)));
        min-height: calc(100dvh - (2 * var(--topbar-height)));
        margin-bottom: 0;
      }

      .hero-divider {
        display: block;
        height: var(--topbar-height);
        margin-bottom: calc(7.8rem - var(--topbar-height));
      }
    }

    @media (max-width: 900px) {
      .hero {
        grid-template-columns: 1fr;
        padding: 1.4rem;
      }

      .hero-actions {
        gap: 1rem;
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
export class HomePageComponent {}
