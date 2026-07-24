import { ARENA_TARGETS, isTargetDepleted } from './targets';
import { TRAINING_ZOMBIE_SPAWNS, type TrainingZombieId } from './zombie';

export const ENCOUNTER_COUNTDOWN_SECONDS = 3;
const MAX_COUNTDOWN_FRAME_DELTA_SECONDS = 0.1;
const COUNTDOWN_BOUNDARY_EPSILON_SECONDS = 1e-9;

export type EncounterState =
  | Readonly<{ phase: 'training' }>
  | Readonly<{ phase: 'countdown'; elapsedSeconds: number }>
  | Readonly<{ phase: 'zombie' }>
  | Readonly<{ phase: 'complete' }>;

export type TrainingTargetHealth = Readonly<Record<string, number>>;

export const createTrainingTargetHealth = (): TrainingTargetHealth =>
  Object.fromEntries(ARENA_TARGETS.map(({ id, maximumHealth }) => [id, maximumHealth]));

export const createEncounterState = (): EncounterState => ({ phase: 'training' });

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

export const areAllTrainingTargetsDepleted = (targetHealth: TrainingTargetHealth) =>
  ARENA_TARGETS.every(({ id }) =>
    Object.hasOwn(targetHealth, id) ? isTargetDepleted(targetHealth[id]) : false,
  );

export function startEncounterCountdown(
  state: EncounterState,
  targetHealth: TrainingTargetHealth,
): EncounterState {
  if (state.phase !== 'training' || !areAllTrainingTargetsDepleted(targetHealth)) return state;
  return { phase: 'countdown', elapsedSeconds: 0 };
}

export function advanceEncounterCountdown(
  state: EncounterState,
  deltaSeconds: number,
): EncounterState {
  if (state.phase !== 'countdown') return state;
  if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return state;
  const elapsedSeconds =
    state.elapsedSeconds + Math.min(deltaSeconds, MAX_COUNTDOWN_FRAME_DELTA_SECONDS);
  return elapsedSeconds >= ENCOUNTER_COUNTDOWN_SECONDS - COUNTDOWN_BOUNDARY_EPSILON_SECONDS
    ? { phase: 'zombie' }
    : { phase: 'countdown', elapsedSeconds };
}

export function encounterCountdownValue(state: EncounterState): 3 | 2 | 1 | null {
  if (state.phase !== 'countdown') return null;
  return Math.max(
    1,
    Math.ceil(
      ENCOUNTER_COUNTDOWN_SECONDS - state.elapsedSeconds - COUNTDOWN_BOUNDARY_EPSILON_SECONDS,
    ),
  ) as 3 | 2 | 1;
}

export const hasEncounterPresentationChanged = (
  previous: EncounterState,
  next: EncounterState,
) =>
  previous.phase !== next.phase ||
  encounterCountdownValue(previous) !== encounterCountdownValue(next);
