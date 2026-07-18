export const SHOT_COOLDOWN_SECONDS = 0.32;
export const SHOT_PELLET_COUNT = 9;
export const SHOT_SPREAD_RADIANS = 0.052;
export const MAGAZINE_CAPACITY = 10;
export const RELOAD_SECONDS = 1.15;

export const RELOAD_PHASE_TIMINGS = {
  lowerEnd: 0.2,
  handleEnd: 0.56,
  impactEnd: 0.74,
  settleEnd: RELOAD_SECONDS,
} as const;

export type ReloadAnimationPhase = 'lower' | 'handle' | 'impact' | 'settle' | 'complete';

export type ReloadPose = {
  phase: ReloadAnimationPhase;
  positionX: number;
  positionY: number;
  positionZ: number;
  rotationX: number;
  rotationZ: number;
};

export type WeaponState = Readonly<{
  ammunition: number;
  isReloading: boolean;
}>;

export const INITIAL_WEAPON_STATE: WeaponState = {
  ammunition: MAGAZINE_CAPACITY,
  isReloading: false,
};

export type ShotOffset = readonly [horizontal: number, vertical: number];
export type ShotCollision<T> = Readonly<{ target: T | null }>;

const PELLET_PATTERN: readonly ShotOffset[] = [
  [0, 0],
  [-0.35, -0.25],
  [0.35, -0.25],
  [-0.35, 0.25],
  [0.35, 0.25],
  [-0.7, 0],
  [0.7, 0],
  [0, -0.7],
  [0, 0.7],
];

export const canFireShot = (lastShotAt: number, now: number) =>
  Number.isFinite(now) && now - lastShotAt >= SHOT_COOLDOWN_SECONDS;

export const canFireWeapon = (state: WeaponState, lastShotAt: number, now: number) =>
  state.ammunition > 0 && !state.isReloading && canFireShot(lastShotAt, now);

export function consumeRound(state: WeaponState): WeaponState {
  if (state.ammunition <= 0 || state.isReloading) return state;
  return { ...state, ammunition: state.ammunition - 1 };
}

export function startReload(state: WeaponState): WeaponState {
  if (state.ammunition >= MAGAZINE_CAPACITY || state.isReloading) return state;
  return { ...state, isReloading: true };
}

export function completeReload(state: WeaponState): WeaponState {
  if (!state.isReloading) return state;
  return { ammunition: MAGAZINE_CAPACITY, isReloading: false };
}

export const isReloadInput = (code: string, repeat: boolean) => code === 'KeyR' && !repeat;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const easeOutCubic = (value: number) => 1 - (1 - clamp01(value)) ** 3;
const easeInOutCubic = (value: number) => {
  const progress = clamp01(value);
  return progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
};
const mix = (start: number, end: number, progress: number) => start + (end - start) * progress;

const pose = (
  target: ReloadPose,
  phase: ReloadAnimationPhase,
  strength: number,
  handling = strength,
): ReloadPose => {
  target.phase = phase;
  target.positionX = mix(0.12, 0.2, handling) * strength;
  target.positionY = mix(-0.08, -0.14, handling) * strength;
  target.positionZ = mix(0.01, 0.04, handling) * strength;
  target.rotationX = mix(-0.12, -0.22, handling) * strength;
  target.rotationZ = mix(-0.1, -0.18, handling) * strength;
  return target;
};

const createReloadPose = (): ReloadPose => ({
  phase: 'complete',
  positionX: 0,
  positionY: 0,
  positionZ: 0,
  rotationX: 0,
  rotationZ: 0,
});

const restingPose = (target: ReloadPose, phase: ReloadAnimationPhase): ReloadPose => {
  target.phase = phase;
  target.positionX = 0;
  target.positionY = 0;
  target.positionZ = 0;
  target.rotationX = 0;
  target.rotationZ = 0;
  return target;
};

export function reloadPoseAt(
  elapsedSeconds: number,
  target: ReloadPose = createReloadPose(),
): ReloadPose {
  const elapsed = Number.isFinite(elapsedSeconds) ? Math.max(0, elapsedSeconds) : 0;
  if (elapsed === 0) return restingPose(target, 'lower');
  if (elapsed < RELOAD_PHASE_TIMINGS.lowerEnd) {
    const progress = easeOutCubic(elapsed / RELOAD_PHASE_TIMINGS.lowerEnd);
    return pose(target, 'lower', progress, 0);
  }
  if (elapsed < RELOAD_PHASE_TIMINGS.handleEnd) {
    const progress = easeInOutCubic(
      (elapsed - RELOAD_PHASE_TIMINGS.lowerEnd) /
        (RELOAD_PHASE_TIMINGS.handleEnd - RELOAD_PHASE_TIMINGS.lowerEnd),
    );
    return pose(target, 'handle', 1, progress);
  }
  if (elapsed < RELOAD_PHASE_TIMINGS.impactEnd) {
    const progress = easeOutCubic(
      (elapsed - RELOAD_PHASE_TIMINGS.handleEnd) /
        (RELOAD_PHASE_TIMINGS.impactEnd - RELOAD_PHASE_TIMINGS.handleEnd),
    );
    target.phase = 'impact';
    target.positionX = mix(0.2, 0.18, progress);
    target.positionY = mix(-0.14, -0.12, progress);
    target.positionZ = mix(0.04, 0.02, progress);
    target.rotationX = mix(-0.22, -0.18, progress);
    target.rotationZ = mix(-0.18, -0.14, progress);
    return target;
  }
  if (elapsed < RELOAD_PHASE_TIMINGS.settleEnd) {
    const progress = easeOutCubic(
      (elapsed - RELOAD_PHASE_TIMINGS.impactEnd) /
        (RELOAD_PHASE_TIMINGS.settleEnd - RELOAD_PHASE_TIMINGS.impactEnd),
    );
    const strength = 1 - progress;
    target.phase = 'settle';
    target.positionX = 0.18 * strength;
    target.positionY = -0.12 * strength;
    target.positionZ = 0.02 * strength;
    target.rotationX = -0.18 * strength;
    target.rotationZ = -0.14 * strength;
    return target;
  }
  return restingPose(target, 'complete');
}

export const pelletOffsets = (): readonly ShotOffset[] =>
  PELLET_PATTERN.map(([horizontal, vertical]) => [
    horizontal * SHOT_SPREAD_RADIANS,
    vertical * SHOT_SPREAD_RADIANS,
  ]);

export const firstShotTarget = <T>(collisions: readonly ShotCollision<T>[]) =>
  collisions[0]?.target ?? null;
