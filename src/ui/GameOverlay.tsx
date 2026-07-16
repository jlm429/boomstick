import { APP_VERSION } from '../game/constants';

export function GameHud() {
  return (
    <div className="hud" aria-hidden="true">
      <div className="crosshair">
        <i />
        <i />
      </div>
      <span>BOOMSTICK // v{APP_VERSION}</span>
      <span className="hud-hint">Enter Arena for mouse look</span>
    </div>
  );
}

export function EntryPrompt({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="entry-prompt">
      <p>Ready for the arena?</p>
      <button className="button button-primary" onClick={onEnter}>
        Enter arena
      </button>
      <span>
        Enter Arena captures your mouse. WASD moves, Mouse looks, Space jumps, Esc pauses.
      </span>
    </div>
  );
}

export function PauseMenu({
  onResume,
  onRestart,
  onMainMenu,
}: {
  onResume: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
}) {
  return (
    <div className="pause-layer" role="dialog" aria-modal="true" aria-labelledby="pause-title">
      <section className="pause-panel">
        <p className="eyebrow">Simulation paused</p>
        <h2 id="pause-title">Catch your breath.</h2>
        <button className="button button-primary" autoFocus onClick={onResume}>
          Resume
        </button>
        <button className="button" onClick={onRestart}>
          Restart
        </button>
        <button className="button" onClick={onMainMenu}>
          Return to Main Menu
        </button>
      </section>
    </div>
  );
}
