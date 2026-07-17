import { ARENA_BLOCKS, type Vector3Tuple } from './arena';
import { ARENA_TARGETS } from './targets';

export type HitCandidate = Readonly<{
  id: string;
  position: Vector3Tuple;
  halfExtents: Vector3Tuple;
}>;

const BLOCKERS: readonly HitCandidate[] = ARENA_BLOCKS;

const rayBoxDistance = (
  origin: Vector3Tuple,
  direction: Vector3Tuple,
  position: Vector3Tuple,
  halfExtents: Vector3Tuple,
) => {
  let entry = -Infinity;
  let exit = Infinity;

  for (let axis = 0; axis < 3; axis += 1) {
    const component = direction[axis];
    const minimum = position[axis] - halfExtents[axis];
    const maximum = position[axis] + halfExtents[axis];

    if (component === 0) {
      if (origin[axis] < minimum || origin[axis] > maximum) return null;
      continue;
    }

    const first = (minimum - origin[axis]) / component;
    const second = (maximum - origin[axis]) / component;
    entry = Math.max(entry, Math.min(first, second));
    exit = Math.min(exit, Math.max(first, second));
    if (entry > exit) return null;
  }

  return exit < 0 ? null : Math.max(0, entry);
};

export const resolveNearestTargetHit = (
  origin: Vector3Tuple,
  direction: Vector3Tuple,
  targets: readonly HitCandidate[],
  blockers: readonly HitCandidate[],
) => {
  let nearestTarget: string | null = null;
  let nearestDistance = Infinity;

  for (const target of targets) {
    const distance = rayBoxDistance(origin, direction, target.position, target.halfExtents);
    if (distance !== null && distance < nearestDistance) {
      nearestDistance = distance;
      nearestTarget = target.id;
    }
  }

  for (const blocker of blockers) {
    const distance = rayBoxDistance(origin, direction, blocker.position, blocker.halfExtents);
    if (distance !== null && distance <= nearestDistance) return null;
  }

  return nearestTarget;
};

export const resolvePelletHit = (origin: Vector3Tuple, direction: Vector3Tuple) =>
  resolveNearestTargetHit(origin, direction, ARENA_TARGETS, BLOCKERS);
