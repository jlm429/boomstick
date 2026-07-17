import { type ReactNode } from 'react';
import landingPageArtwork from '../../docs/images/new_landing_page.png';

export function Frame({ children }: { children: ReactNode }) {
  return (
    <main className="screen-shell">
      <img className="landing-artwork" src={landingPageArtwork} alt="" aria-hidden="true" />
      {children}
    </main>
  );
}

export function MainMenu({ onPlay, onAbout }: { onPlay: () => void; onAbout: () => void }) {
  return (
    <Frame>
      <section className="menu-panel" aria-labelledby="boomstick-title">
        <p className="eyebrow">by Pew Pew Labs</p>
        <h1 id="boomstick-title">BOOMSTICK</h1>
        <p className="tagline">Built for modern browsers. Inspired by the classics.</p>
        <nav className="menu-actions" aria-label="Main navigation">
          <button className="button button-primary" onClick={onPlay}>
            Enter Arena
          </button>
          <button className="button" onClick={onAbout}>
            About
          </button>
        </nav>
      </section>
    </Frame>
  );
}

export function About({ onBack }: { onBack: () => void }) {
  return (
    <Frame>
      <section
        className="menu-panel about-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
      >
        <h1 id="about-title">About</h1>
        <p>
          Boomstick is a modern browser-based first-person arena built with JavaScript, React,
          WebGL, and Rapier physics.
        </p>
        <p>
          It explores responsive movement, real-time rendering, collision systems, and
          browser-based game architecture, with inspiration from classic first-person shooters.
        </p>
        <button className="button" onClick={onBack}>
          Close
        </button>
      </section>
    </Frame>
  );
}
