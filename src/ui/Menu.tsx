import { type ReactNode } from 'react';

export function Frame({ children }: { children: ReactNode }) {
  return <main className="screen-shell">{children}</main>;
}

export function MainMenu({ onPlay, onAbout }: { onPlay: () => void; onAbout: () => void }) {
  return (
    <Frame>
      <section className="menu-panel" aria-labelledby="boomstick-title">
        <p className="eyebrow">Single player arena prototype</p>
        <h1 id="boomstick-title">Boomstick</h1>
        <p className="tagline">Move fast. Own the arena.</p>
        <nav className="menu-actions" aria-label="Main navigation">
          <button className="button button-primary" onClick={onPlay}>
            Play
          </button>
          <button className="button" onClick={onAbout}>
            About
          </button>
          <button
            className="button"
            disabled
            title="Settings are planned for a future milestone"
          >
            Settings <span>Coming soon</span>
          </button>
        </nav>
        <p className="menu-footnote">
          Mouse and keyboard recommended. You can navigate this menu without pointer lock.
        </p>
      </section>
    </Frame>
  );
}

export function About({ onBack }: { onBack: () => void }) {
  return (
    <Frame>
      <section className="menu-panel about-panel" aria-labelledby="about-title">
        <p className="eyebrow">About</p>
        <h1 id="about-title">Built for velocity.</h1>
        <p>
          Boomstick is an original browser-based FPS foundation. This first arena is about clean
          movement, responsive controls, and a place that feels worth exploring.
        </p>
        <p className="controls-copy">
          <kbd>WASD</kbd> move <kbd>Mouse</kbd> look <kbd>Space</kbd> jump <kbd>Esc</kbd> pause
        </p>
        <button className="button button-primary" onClick={onBack}>
          Back to main menu
        </button>
      </section>
    </Frame>
  );
}
