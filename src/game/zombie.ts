import { targetDamageAt } from './targets';
import { WEAK_ZOMBIE_ATTACK } from './zombieAttack';
import type { Vector3Tuple } from './arena';

export const ZOMBIE_MAX_HEALTH = 300;
export const ZOMBIE_MOVE_SPEED = 3.2;
export const ZOMBIE_SPEED_MULTIPLIER_MIN = 0.95;
export const ZOMBIE_SPEED_MULTIPLIER_MAX = 1.05;
export const ZOMBIE_ATTACK_DISTANCE = WEAK_ZOMBIE_ATTACK.range;
export const ZOMBIE_COLLIDER_RADIUS = 0.38;
export const ZOMBIE_CORPSE_SECONDS = 5;
export const ZOMBIE_STEERING_LOOKAHEAD = 3.6;
const ZOMBIE_ATTACK_ALIGNMENT = Math.cos(Math.PI / 6);

export type TrainingZombieSpawn = Readonly<{
  id: string;
  position: Vector3Tuple;
  rotation: number;
  concealedBy: string;
}>;

export const TRAINING_ZOMBIE_SPAWNS = [
  {
    id: 'west-cover-zombie',
    position: [-8, 0.03, 2.2],
    rotation: 0.684,
    concealedBy: 'west-cover',
  },
  {
    id: 'east-cover-zombie',
    position: [9, 0.03, 5],
    rotation: -0.91,
    concealedBy: 'east-cover',
  },
  {
    id: 'west-pillar-zombie',
    position: [-9, 0.03, -5.2],
    rotation: 0.482,
    concealedBy: 'west-pillar',
  },
  {
    id: 'east-pillar-zombie',
    position: [9, 0.03, -5.2],
    rotation: -0.482,
    concealedBy: 'east-pillar',
  },
  {
    id: 'gateway-zombie',
    position: [3.1, 0.03, -12.4],
    rotation: -0.126,
    concealedBy: 'landmark-right',
  },
] as const satisfies readonly TrainingZombieSpawn[];

export type TrainingZombieId = (typeof TRAINING_ZOMBIE_SPAWNS)[number]['id'];

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

export const selectZombieFacingDirection = (
  mode: ZombieBehaviorMode,
  playerDirection: PlanarDirection,
  movementDirection: PlanarDirection,
) => (mode === 'attack' ? playerDirection : movementDirection);

export function isZombieFacingPlayer(yaw: number, direction: PlanarDirection) {
  const distance = Math.hypot(direction.x, direction.z);
  return (
    distance > 0 &&
    Math.sin(yaw) * direction.x + Math.cos(yaw) * direction.z >=
      distance * ZOMBIE_ATTACK_ALIGNMENT
  );
}

export type ZombieSteeringProbe = (
  direction: PlanarDirection,
  maximumDistance: number,
) => boolean;

export type ZombieState = Readonly<{
  health: number;
  dead: boolean;
}>;

export type ZombieMotionVariation = Readonly<{
  walkPhase: number;
  speedMultiplier: number;
}>;

export type ZombieHitResult = Readonly<{
  state: ZombieState;
  damage: number;
  reacted: boolean;
}>;

export type ZombiePelletHitResult = Readonly<{
  state: ZombieState;
  damage: number;
  reactedHits: number;
}>;

export const createZombieState = (): ZombieState => ({
  health: ZOMBIE_MAX_HEALTH,
  dead: false,
});

export const createZombieMotionVariation = (
  random: () => number = Math.random,
): ZombieMotionVariation => ({
  walkPhase: random(),
  speedMultiplier:
    ZOMBIE_SPEED_MULTIPLIER_MIN +
    random() * (ZOMBIE_SPEED_MULTIPLIER_MAX - ZOMBIE_SPEED_MULTIPLIER_MIN),
});

export const zombieMovementSpeed = ({ speedMultiplier }: ZombieMotionVariation) =>
  ZOMBIE_MOVE_SPEED * speedMultiplier;

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

function probeDirectZombieSteering(
  toGoal: PlanarDirection,
  distance: number,
  isBlocked: ZombieSteeringProbe,
): ZombieSteering {
  if (!Number.isFinite(distance) || distance <= 0) {
    return { direction: { x: 0, z: 0 }, directPathClear: true, side: null };
  }
  const inverseDistance = 1 / distance;
  const direction = { x: toGoal.x * inverseDistance, z: toGoal.z * inverseDistance };
  return { direction, directPathClear: !isBlocked(direction, distance), side: null };
}

export function selectDirectZombieSteering(
  toGoal: PlanarDirection,
  distance: number,
  isBlocked: ZombieSteeringProbe,
): ZombieSteering | null {
  const steering = probeDirectZombieSteering(toGoal, distance, isBlocked);
  return steering.directPathClear ? steering : null;
}

export function selectZombieSteering(
  toPlayer: PlanarDirection,
  distanceToPlayer: number,
  previousSide: ZombieSteeringSide,
  isBlocked: ZombieSteeringProbe,
): ZombieSteering {
  const direct = probeDirectZombieSteering(toPlayer, distanceToPlayer, isBlocked);
  if (direct.directPathClear) return direct;

  const sides: readonly Exclude<ZombieSteeringSide, null>[] = previousSide
    ? [previousSide, previousSide === 1 ? -1 : 1]
    : [1, -1];
  const lookahead = Math.min(distanceToPlayer, ZOMBIE_STEERING_LOOKAHEAD);
  const angles = [Math.PI / 5, Math.PI / 3, Math.PI / 2] as const;
  for (const side of sides) {
    for (const angle of angles) {
      const direction = rotatedDirection(direct.direction, angle, side);
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

export function hitZombieWithPellets(
  state: ZombieState,
  pelletDistances: readonly number[],
): ZombiePelletHitResult {
  let nextState = state;
  let damage = 0;
  let reactedHits = 0;
  for (const distance of pelletDistances) {
    const result = hitZombie(nextState, distance);
    nextState = result.state;
    damage += result.damage;
    if (result.reacted) reactedHits += 1;
  }
  return { state: nextState, damage, reactedHits };
}
