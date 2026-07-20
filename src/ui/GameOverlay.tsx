import { APP_VERSION } from '../game/constants';
import { MAGAZINE_CAPACITY, type WeaponState } from '../game/shooting';

export function GameHud({
  emptyFirePulse,
  encounterCountdown,
  playing,
  weaponState,
}: {
  emptyFirePulse: number;
  encounterCountdown: 3 | 2 | 1 | null;
  playing: boolean;
  weaponState: WeaponState;
}) {
  return (
    <>
      <div className="hud" aria-hidden="true">
        <div className="crosshair">
          <i />
          <i />
        </div>
        <span>BOOMSTICK // v{APP_VERSION}</span>
        <span className={weaponState.isReloading ? 'hud-ammo is-reloading' : 'hud-ammo'}>
          {weaponState.ammunition} / {MAGAZINE_CAPACITY}
        </span>
        {weaponState.ammunition === 0 && !weaponState.isReloading && (
          <span key={emptyFirePulse} className="hud-reload-reminder">
            R to Reload
          </span>
        )}
        <span className="hud-hint">
          {playing ? 'Escape to pause' : 'Enter Arena for mouse look'}
        </span>
      </div>
      {encounterCountdown !== null && (
        <div
          key={encounterCountdown}
          className="encounter-countdown"
          role="status"
          aria-live="assertive"
          aria-label={`Zombie encounter begins in ${encounterCountdown}`}
        >
          {encounterCountdown}
        </div>
      )}
    </>
  );
}

export function EntryPrompt({ error, onEnter }: { error: string | null; onEnter: () => void }) {
  return (
    <section className="entry-prompt" aria-labelledby="entry-title">
      <p id="entry-title">Enter Arena</p>
      <span className="entry-instruction">Click to capture the mouse and begin.</span>
      <button className="button button-primary" onClick={onEnter}>
        Enter Arena
      </button>
      <dl className="entry-controls" aria-label="Arena controls">
        <div>
          <dt>WASD</dt>
          <dd>Move</dd>
        </div>
        <div>
          <dt>Mouse</dt>
          <dd>Look</dd>
        </div>
        <div>
          <dt>Space</dt>
          <dd>Jump</dd>
        </div>
        <div>
          <dt>Escape</dt>
          <dd>Pause</dd>
        </div>
        <div>
          <dt>R</dt>
          <dd>Reload</dd>
        </div>
      </dl>
      {error && <span className="entry-error">{error}</span>}
    </section>
  );
}

export function PauseMenu({
  error,
  onResume,
  onRestart,
  onMainMenu,
}: {
  error: string | null;
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
        {error && <p className="pause-error">{error}</p>}
      </section>
    </div>
  );
}
