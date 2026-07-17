export const SHOT_COOLDOWN_SECONDS = 0.32;
export const SHOT_PELLET_COUNT = 9;
export const SHOT_SPREAD_RADIANS = 0.052;

export type ShotOffset = readonly [horizontal: number, vertical: number];

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

export const pelletOffsets = (): readonly ShotOffset[] =>
  PELLET_PATTERN.map(([horizontal, vertical]) => [
    horizontal * SHOT_SPREAD_RADIANS,
    vertical * SHOT_SPREAD_RADIANS,
  ]);
