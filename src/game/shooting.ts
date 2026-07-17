export const SHOT_COOLDOWN_SECONDS = 0.32;
export const SHOT_PELLET_COUNT = 9;
export const SHOT_SPREAD_RADIANS = 0.052;
export const MAGAZINE_CAPACITY = 10;
export const RELOAD_SECONDS = 1.15;

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

export const pelletOffsets = (): readonly ShotOffset[] =>
  PELLET_PATTERN.map(([horizontal, vertical]) => [
    horizontal * SHOT_SPREAD_RADIANS,
    vertical * SHOT_SPREAD_RADIANS,
  ]);

export const firstShotTarget = <T>(collisions: readonly ShotCollision<T>[]) =>
  collisions[0]?.target ?? null;
