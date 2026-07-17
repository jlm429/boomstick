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

export function MainMenu({
  onPlay,
  onAbout,
  onControls,
}: {
  onPlay: () => void;
  onAbout: () => void;
  onControls: () => void;
}) {
  return (
    <Frame>
      <section className="menu-panel" aria-labelledby="boomstick-title">
        <p className="eyebrow">by Pew Pew Labs</p>
        <h1 id="boomstick-title">BOOMSTICK</h1>
        <nav className="menu-actions" aria-label="Main navigation">
          <button className="button button-primary" onClick={onPlay}>
            Enter Arena
          </button>
          <button className="button" onClick={onAbout}>
            About
          </button>
          <button className="button" onClick={onControls}>
            Controls
          </button>
        </nav>
      </section>
    </Frame>
  );
}

export function Controls({
  invertY,
  onInvertYChange,
  onBack,
}: {
  invertY: boolean;
  onInvertYChange: (invertY: boolean) => void;
  onBack: () => void;
}) {
  return (
    <Frame>
      <section className="menu-panel about-panel" aria-labelledby="controls-title">
        <p className="eyebrow">Settings</p>
        <h1 id="controls-title">Controls</h1>
        <label className="setting-toggle">
          <input
            type="checkbox"
            checked={invertY}
            onChange={(event) => onInvertYChange(event.target.checked)}
          />
          <span>Invert Y</span>
        </label>
        <p className="setting-copy">
          Reverse vertical mouse look. This setting is saved in this browser.
        </p>
        <button className="button" onClick={onBack}>
          Back
        </button>
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
