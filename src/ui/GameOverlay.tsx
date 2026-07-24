import { APP_VERSION } from '../game/constants';
import {
  DEATH_SEQUENCE_MS,
  PLAYER_MAX_HEALTH,
  healthBandFor,
  isCriticalPlayerHealth,
  type PlayerLifeState,
} from '../game/playerHealth';
import { MAGAZINE_CAPACITY, type WeaponState } from '../game/shooting';

export function HealthModule({
  damageRevision,
  health,
}: {
  damageRevision: number;
  health: number;
}) {
  const healthBand = healthBandFor(health);
  const displayHealth = Math.round(Math.max(0, Math.min(PLAYER_MAX_HEALTH, health)));

  return (
    <div className={`hud-health hud-health--${healthBand}`} data-testid="health-module">
      <span className="hud-health-label">Health</span>
      <strong className="hud-health-value">{displayHealth}</strong>
      <span className="hud-health-track">
        <span className="hud-health-fill" style={{ width: `${displayHealth}%` }} />
      </span>
      {damageRevision > 0 && (
        <i
          key={damageRevision}
          className="hud-health-damage"
          data-testid="health-damage-pulse"
        />
      )}
    </div>
  );
}

export function GameHud({
  damageRevision,
  emptyFirePulse,
  encounterCountdown,
  health,
  lifeState,
  playing,
  weaponState,
}: {
  damageRevision: number;
  emptyFirePulse: number;
  encounterCountdown: 3 | 2 | 1 | null;
  health: number;
  lifeState: PlayerLifeState;
  playing: boolean;
  weaponState: WeaponState;
}) {
  const playerAlive = lifeState === 'alive';

  return (
    <>
      <div className={playerAlive ? 'hud' : 'hud is-player-down'} aria-hidden="true">
        <div className="crosshair">
          <i />
          <i />
        </div>
        <span>BOOMSTICK // v{APP_VERSION}</span>
        <HealthModule damageRevision={damageRevision} health={health} />
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
      {isCriticalPlayerHealth(health, lifeState) && (
        <div
          className="critical-health-vignette"
          data-testid="critical-health-effect"
          aria-hidden
        />
      )}
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

export function DefeatOverlay({
  lifeState,
  onRetry,
  onMainMenu,
}: {
  lifeState: PlayerLifeState;
  onRetry: () => void;
  onMainMenu: () => void;
}) {
  if (lifeState === 'alive') return null;

  if (lifeState === 'dying') {
    return (
      <div
        className="death-layer is-dying"
        data-testid="death-fade"
        style={{ animationDuration: `${DEATH_SEQUENCE_MS}ms` }}
        aria-hidden
      />
    );
  }

  return (
    <div
      className="death-layer is-dead"
      role="dialog"
      aria-modal="true"
      aria-labelledby="defeat-title"
    >
      <section className="defeat-panel">
        <p className="eyebrow">Training terminated</p>
        <h2 id="defeat-title">You Went Down</h2>
        <p className="defeat-message">Stand up. Load in. Try again.</p>
        <button className="button button-primary" autoFocus onClick={onRetry}>
          Retry
        </button>
        <button className="button" onClick={onMainMenu}>
          Return to Main Menu
        </button>
      </section>
    </div>
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

export function TrainingComplete({ onRestart }: { onRestart: () => void }) {
  return (
    <div
      className="completion-layer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="completion-title"
      aria-describedby="completion-soon"
    >
      <section className="completion-panel">
        <h2 id="completion-title">Training Complete</h2>
        <p id="completion-soon" className="completion-soon">
          Level 1 coming soon...
        </p>
        <button className="button button-primary" autoFocus onClick={onRestart}>
          Restart Training
        </button>
      </section>
    </div>
  );
}
