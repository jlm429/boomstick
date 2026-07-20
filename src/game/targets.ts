import type { Vector3Tuple } from './arena';

export const TARGET_MAX_HEALTH = 100;
export const BASE_SHOTGUN_DAMAGE = 22;
export const MIN_DISTANCE_DAMAGE_MULTIPLIER = 0.35;
export const MAX_DAMAGE_FALLOFF_DISTANCE = 30;
export const MIN_ACCURACY_DAMAGE_MULTIPLIER = 0.4;
export const TARGET_HIT_RADIUS = 0.48;

export type TargetDefinition = Readonly<{
  id: string;
  position: Vector3Tuple;
  halfExtents: Vector3Tuple;
  maximumHealth: number;
}>;

export const ARENA_TARGETS: readonly TargetDefinition[] = [
  {
    id: 'target-near',
    position: [0, 2, 3],
    halfExtents: [0.7, 1, 0.24],
    maximumHealth: TARGET_MAX_HEALTH,
  },
  {
    id: 'target-left',
    position: [-4.5, 2, -4],
    halfExtents: [0.7, 1, 0.24],
    maximumHealth: TARGET_MAX_HEALTH,
  },
  {
    id: 'target-right',
    position: [6, 2, -8],
    halfExtents: [0.7, 1, 0.24],
    maximumHealth: TARGET_MAX_HEALTH,
  },
  {
    id: 'target-far',
    position: [0, 2, -18],
    halfExtents: [0.7, 1, 0.24],
    maximumHealth: TARGET_MAX_HEALTH,
  },
];

export type TargetFacePoint = Readonly<{
  x: number;
  y: number;
}>;

export type TargetHitResult = Readonly<{
  health: number;
  damage: number;
  reacted: boolean;
}>;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smoothstep = (value: number) => {
  const progress = clamp01(value);
  return progress * progress * (3 - 2 * progress);
};
const mix = (start: number, end: number, progress: number) => start + (end - start) * progress;

export function distanceDamageMultiplier(distance: number) {
  const safeDistance = Number.isFinite(distance)
    ? Math.max(0, distance)
    : MAX_DAMAGE_FALLOFF_DISTANCE;
  return mix(
    1,
    MIN_DISTANCE_DAMAGE_MULTIPLIER,
    smoothstep(safeDistance / MAX_DAMAGE_FALLOFF_DISTANCE),
  );
}

export function accuracyDamageMultiplier(localHitPoint: TargetFacePoint) {
  const radialDistance = Math.hypot(localHitPoint.x, localHitPoint.y);
  const safeRadialDistance = Number.isFinite(radialDistance)
    ? radialDistance
    : TARGET_HIT_RADIUS;
  return mix(
    1,
    MIN_ACCURACY_DAMAGE_MULTIPLIER,
    smoothstep(safeRadialDistance / TARGET_HIT_RADIUS),
  );
}

export function targetDamageAt(distance: number, localHitPoint: TargetFacePoint) {
  return (
    BASE_SHOTGUN_DAMAGE *
    distanceDamageMultiplier(distance) *
    accuracyDamageMultiplier(localHitPoint)
  );
}

export function clampTargetHealth(health: number, maximumHealth = TARGET_MAX_HEALTH) {
  if (!Number.isFinite(health)) return 0;
  return Math.min(maximumHealth, Math.max(0, health));
}

export const isTargetDepleted = (health: number) => clampTargetHealth(health) === 0;

export function hitTarget(
  currentHealth: number,
  distance: number,
  localHitPoint: TargetFacePoint,
  maximumHealth = TARGET_MAX_HEALTH,
): TargetHitResult {
  const health = clampTargetHealth(currentHealth, maximumHealth);
  if (isTargetDepleted(health)) return { health, damage: 0, reacted: false };

  const nextHealth = clampTargetHealth(
    health - targetDamageAt(distance, localHitPoint),
    maximumHealth,
  );
  return {
    health: nextHealth,
    damage: health - nextHealth,
    reacted: true,
  };
}
