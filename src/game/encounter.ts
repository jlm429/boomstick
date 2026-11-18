import { ARENA_TARGETS, isTargetDepleted } from './targets';
import { TRAINING_ZOMBIE_SPAWNS, type TrainingZombieId } from './zombie';

export const ENCOUNTER_COUNTDOWN_SECONDS = 3;
const ZOMBIE_WARMUP_GRACE_SECONDS = 2;
const MAX_COUNTDOWN_FRAME_DELTA_SECONDS = 0.1;
const COUNTDOWN_BOUNDARY_EPSILON_SECONDS = 1e-9;

export type EncounterState =
  | Readonly<{ phase: 'training'; targetsCleared: number }>
  | Readonly<{ phase: 'countdown'; elapsedSeconds: number }>
  | Readonly<{ phase: 'zombie' }>
  | Readonly<{ phase: 'complete' }>;

export type TrainingTargetHealth = Readonly<Record<string, number>>;

export const createTrainingTargetHealth = (): TrainingTargetHealth =>
  Object.fromEntries(ARENA_TARGETS.map(({ id, maximumHealth }) => [id, maximumHealth]));

export const createEncounterState = (): EncounterState => ({
  phase: 'training',
  targetsCleared: 0,
});

export const trainingTargetsHaveCollision = (state: EncounterState) =>
  state.phase === 'training' || state.phase === 'countdown';

export const completeEncounter = (state: EncounterState): EncounterState =>
  state.phase === 'zombie' ? { phase: 'complete' } : state;

export const recordTrainingZombieRemoval = (
  removedZombieIds: ReadonlySet<TrainingZombieId>,
  zombieId: TrainingZombieId,
): ReadonlySet<TrainingZombieId> => {
  if (removedZombieIds.has(zombieId)) return removedZombieIds;
  return new Set([...removedZombieIds, zombieId]);
};

export const areAllTrainingZombiesRemoved = (removedZombieIds: ReadonlySet<TrainingZombieId>) =>
  TRAINING_ZOMBIE_SPAWNS.every(({ id }) => removedZombieIds.has(id));

export function updateTrainingProgress(
  state: EncounterState,
  targetHealth: TrainingTargetHealth,
): EncounterState {
  if (state.phase !== 'training') return state;
  const targetsCleared = ARENA_TARGETS.filter(
    ({ id }) => Object.hasOwn(targetHealth, id) && isTargetDepleted(targetHealth[id]),
  ).length;
  if (targetsCleared === ARENA_TARGETS.length) return { phase: 'countdown', elapsedSeconds: 0 };
  return targetsCleared === state.targetsCleared ? state : { ...state, targetsCleared };
}

export function advanceEncounterCountdown(
  state: EncounterState,
  deltaSeconds: number,
  zombieRendererReady: boolean,
): EncounterState {
  if (state.phase !== 'countdown') return state;
  if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return state;
  const elapsedSeconds =
    state.elapsedSeconds + Math.min(deltaSeconds, MAX_COUNTDOWN_FRAME_DELTA_SECONDS);
  const transitionSeconds =
    ENCOUNTER_COUNTDOWN_SECONDS + (zombieRendererReady ? 0 : ZOMBIE_WARMUP_GRACE_SECONDS);
  return elapsedSeconds >= transitionSeconds - COUNTDOWN_BOUNDARY_EPSILON_SECONDS
    ? { phase: 'zombie' }
    : { phase: 'countdown', elapsedSeconds };
}

export type EncounterCountdown = 3 | 2 | 1 | 'waiting' | null;

export function encounterCountdownValue(state: EncounterState): EncounterCountdown {
  if (state.phase !== 'countdown') return null;
  const secondsLeft = Math.ceil(
    ENCOUNTER_COUNTDOWN_SECONDS - state.elapsedSeconds - COUNTDOWN_BOUNDARY_EPSILON_SECONDS,
  );
  return secondsLeft <= 0 ? 'waiting' : (secondsLeft as 3 | 2 | 1);
}

export const hasEncounterPresentationChanged = (
  previous: EncounterState,
  next: EncounterState,
) =>
  previous.phase !== next.phase ||
  (previous.phase === 'training' &&
    next.phase === 'training' &&
    previous.targetsCleared !== next.targetsCleared) ||
  encounterCountdownValue(previous) !== encounterCountdownValue(next);
