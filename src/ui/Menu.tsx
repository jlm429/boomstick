import { type ReactNode } from 'react';

export function Frame({ children }: { children: ReactNode }) {
  return <main className="screen-shell">{children}</main>;
}

export function MainMenu({ onPlay, onAbout }: { onPlay: () => void; onAbout: () => void }) {
  return (
    <Frame>
      <section className="menu-panel" aria-labelledby="boomstick-title">
        <p className="eyebrow">by Pew Pew Labs</p>
        <h1 id="boomstick-title">Boomstick</h1>
        <p className="tagline">Bounce, blast off, and make the floor yours.</p>
        <nav className="menu-actions" aria-label="Main navigation">
          <button className="button button-primary" onClick={onPlay}>
            Play
          </button>
          <button className="button" onClick={onAbout}>
            About the arena
          </button>
        </nav>
        <p className="menu-footnote">
          <kbd>WASD</kbd> move <kbd>Mouse</kbd> look <kbd>Space</kbd> jump <kbd>Esc</kbd> pause
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
          Boomstick is an original browser-based arena foundation. This first arena is about
          clean movement, responsive controls, and a place that feels worth exploring.
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
