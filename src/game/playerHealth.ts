export const PLAYER_MAX_HEALTH = 100;
export const CRITICAL_HEALTH_THRESHOLD = 5;

export const DEATH_SEQUENCE_MS = 1000;
export const DEATH_SEQUENCE_SECONDS = DEATH_SEQUENCE_MS / 1000;
export const DEATH_FADE_START_SECONDS = 0.56;
export const DEATH_CAMERA_DROP = 1.08;
export const DEATH_CAMERA_ROLL = -0.14;

export type PlayerLifeState = 'alive' | 'dying' | 'dead';
export type HealthBand = 'healthy' | 'wounded' | 'critical' | 'disabled';

export type DeathVisualState = Readonly<{
  progress: number;
  cameraDrop: number;
  cameraRoll: number;
  fadeOpacity: number;
  complete: boolean;
}>;

export const clampPlayerHealth = (health: number) => {
  if (!Number.isFinite(health)) return 0;
  return Math.min(PLAYER_MAX_HEALTH, Math.max(0, health));
};

export const healthBandFor = (health: number): HealthBand => {
  const safeHealth = clampPlayerHealth(health);
  if (safeHealth === 0) return 'disabled';
  if (safeHealth <= 30) return 'critical';
  if (safeHealth <= 60) return 'wounded';
  return 'healthy';
};

export const isCriticalPlayerHealth = (health: number, lifeState: PlayerLifeState) =>
  lifeState === 'alive' && health > 0 && health <= CRITICAL_HEALTH_THRESHOLD;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const easeInOutCubic = (value: number) => {
  const progress = clamp01(value);
  return progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
};
const easeOutCubic = (value: number) => 1 - (1 - clamp01(value)) ** 3;

export function deathVisualAt(elapsedSeconds: number): DeathVisualState {
  const elapsed = Number.isFinite(elapsedSeconds) ? Math.max(0, elapsedSeconds) : 0;
  const progress = clamp01(elapsed / DEATH_SEQUENCE_SECONDS);
  const fadeProgress = clamp01(
    (elapsed - DEATH_FADE_START_SECONDS) / (DEATH_SEQUENCE_SECONDS - DEATH_FADE_START_SECONDS),
  );

  return {
    progress,
    cameraDrop: DEATH_CAMERA_DROP * easeInOutCubic(progress),
    cameraRoll: progress === 0 ? 0 : DEATH_CAMERA_ROLL * easeOutCubic(progress),
    fadeOpacity: easeInOutCubic(fadeProgress),
    complete: elapsed >= DEATH_SEQUENCE_SECONDS,
  };
}
