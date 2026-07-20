import { targetDamageAt } from './targets';

export const ZOMBIE_MAX_HEALTH = 300;
export const ZOMBIE_MOVE_SPEED = 3.2;
export const ZOMBIE_ATTACK_DISTANCE = 1.85;
export const ZOMBIE_COLLIDER_RADIUS = 0.38;
export const ZOMBIE_CORPSE_SECONDS = 5;
export const ZOMBIE_STEERING_LOOKAHEAD = 3.6;
export const ZOMBIE_STEERING_CLEARANCE = ZOMBIE_COLLIDER_RADIUS + 0.12;
export const ZOMBIE_STEERING_HIT_TOLERANCE = 0.04;
export const ZOMBIE_SPAWN = [7, 0.03, -14] as const;

export type ZombieBehaviorMode = 'idle' | 'chase' | 'attack' | 'hit' | 'dead';

export type ZombieBehaviorState = Readonly<{
  mode: ZombieBehaviorMode;
  elapsed: number;
}>;

export type ZombieBehaviorUpdate = Readonly<{
  delta: number;
  directPathClear: boolean;
  distanceToPlayer: number;
  hitDuration: number;
}>;

export type PlanarDirection = Readonly<{ x: number; z: number }>;
export type ZombieSteeringSide = -1 | 1 | null;

export type ZombieSteering = Readonly<{
  direction: PlanarDirection;
  directPathClear: boolean;
  side: ZombieSteeringSide;
}>;

export type ZombieSteeringProbe = (
  direction: PlanarDirection,
  maximumDistance: number,
) => boolean;

export type ZombieObstacleRaycast = (
  origin: PlanarDirection,
  direction: PlanarDirection,
  maximumDistance: number,
) => number | null;

export type ZombieState = Readonly<{
  health: number;
  dead: boolean;
}>;

export type ZombieHitResult = Readonly<{
  state: ZombieState;
  damage: number;
  reacted: boolean;
}>;

export const createZombieState = (): ZombieState => ({
  health: ZOMBIE_MAX_HEALTH,
  dead: false,
});

export const createZombieBehaviorState = (): ZombieBehaviorState => ({
  mode: 'idle',
  elapsed: 0,
});

const pursuitMode = (distanceToPlayer: number, directPathClear: boolean): ZombieBehaviorMode =>
  directPathClear &&
  Number.isFinite(distanceToPlayer) &&
  distanceToPlayer <= ZOMBIE_ATTACK_DISTANCE
    ? 'attack'
    : 'chase';

export function advanceZombieBehavior(
  state: ZombieBehaviorState,
  { delta, directPathClear, distanceToPlayer, hitDuration }: ZombieBehaviorUpdate,
): ZombieBehaviorState {
  const safeDelta = Number.isFinite(delta) && delta > 0 ? delta : 0;
  if (state.mode === 'dead') return { ...state, elapsed: state.elapsed + safeDelta };
  if (state.mode === 'hit') {
    const elapsed = state.elapsed + safeDelta;
    if (elapsed < Math.max(0, hitDuration)) return { ...state, elapsed };
    return { mode: pursuitMode(distanceToPlayer, directPathClear), elapsed: 0 };
  }

  const mode = pursuitMode(distanceToPlayer, directPathClear);
  return mode === state.mode ? state : { mode, elapsed: 0 };
}

export const interruptZombieBehavior = (
  state: ZombieBehaviorState,
  dead: boolean,
): ZombieBehaviorState => {
  if (state.mode === 'dead') return state;
  return { mode: dead ? 'dead' : 'hit', elapsed: 0 };
};

export const isZombieCorpseExpired = (
  state: ZombieBehaviorState,
  deathAnimationDuration: number,
) =>
  state.mode === 'dead' &&
  state.elapsed >= Math.max(0, deathAnimationDuration) + ZOMBIE_CORPSE_SECONDS;

const rotatedDirection = (
  direction: PlanarDirection,
  angle: number,
  side: Exclude<ZombieSteeringSide, null>,
): PlanarDirection => {
  const sine = Math.sin(angle * side);
  const cosine = Math.cos(angle);
  return {
    x: direction.x * cosine - direction.z * sine,
    z: direction.x * sine + direction.z * cosine,
  };
};

export function isZombieSteeringBlocked(
  position: PlanarDirection,
  direction: PlanarDirection,
  maximumDistance: number,
  castRay: ZombieObstacleRaycast,
) {
  const perpendicular = { x: direction.z, z: -direction.x };
  for (const offset of [-ZOMBIE_STEERING_CLEARANCE, 0, ZOMBIE_STEERING_CLEARANCE]) {
    const hitDistance = castRay(
      {
        x: position.x + perpendicular.x * offset,
        z: position.z + perpendicular.z * offset,
      },
      direction,
      maximumDistance,
    );
    if (
      hitDistance !== null &&
      hitDistance > ZOMBIE_STEERING_HIT_TOLERANCE &&
      hitDistance < maximumDistance - ZOMBIE_STEERING_HIT_TOLERANCE
    ) {
      return true;
    }
  }
  return false;
}

export function selectZombieSteering(
  toPlayer: PlanarDirection,
  distanceToPlayer: number,
  previousSide: ZombieSteeringSide,
  isBlocked: ZombieSteeringProbe,
): ZombieSteering {
  if (!Number.isFinite(distanceToPlayer) || distanceToPlayer <= 0) {
    return { direction: { x: 0, z: 0 }, directPathClear: true, side: null };
  }
  const inverseDistance = 1 / distanceToPlayer;
  const direct = { x: toPlayer.x * inverseDistance, z: toPlayer.z * inverseDistance };
  if (!isBlocked(direct, distanceToPlayer)) {
    return { direction: direct, directPathClear: true, side: null };
  }

  const sides: readonly Exclude<ZombieSteeringSide, null>[] = previousSide
    ? [previousSide, previousSide === 1 ? -1 : 1]
    : [1, -1];
  const lookahead = Math.min(distanceToPlayer, ZOMBIE_STEERING_LOOKAHEAD);
  const angles = [Math.PI / 5, Math.PI / 3, Math.PI / 2] as const;
  for (const angle of angles) {
    for (const side of sides) {
      const direction = rotatedDirection(direct, angle, side);
      if (!isBlocked(direction, lookahead)) {
        return { direction, directPathClear: false, side };
      }
    }
  }

  return {
    direction: { x: 0, z: 0 },
    directPathClear: false,
    side: previousSide,
  };
}

export function hitZombie(state: ZombieState, distance: number): ZombieHitResult {
  if (state.dead || state.health <= 0) return { state, damage: 0, reacted: false };

  const damage = targetDamageAt(distance, { x: 0, y: 0 });
  const health = Math.max(0, state.health - damage);
  return {
    state: { health, dead: health === 0 },
    damage: state.health - health,
    reacted: true,
  };
}
