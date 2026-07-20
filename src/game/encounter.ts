import { ARENA_TARGETS, isTargetDepleted } from './targets';

export const ENCOUNTER_COUNTDOWN_SECONDS = 3;

export type EncounterState =
  | Readonly<{ phase: 'training' }>
  | Readonly<{ phase: 'countdown'; elapsedSeconds: number }>
  | Readonly<{ phase: 'zombie' }>;

export type TrainingTargetHealth = Readonly<Record<string, number>>;

export const createTrainingTargetHealth = (): TrainingTargetHealth =>
  Object.fromEntries(ARENA_TARGETS.map(({ id, maximumHealth }) => [id, maximumHealth]));

export const createEncounterState = (): EncounterState => ({ phase: 'training' });

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
  const elapsedSeconds = state.elapsedSeconds + deltaSeconds;
  return elapsedSeconds >= ENCOUNTER_COUNTDOWN_SECONDS
    ? { phase: 'zombie' }
    : { phase: 'countdown', elapsedSeconds };
}

export function encounterCountdownValue(state: EncounterState): 3 | 2 | 1 | null {
  if (state.phase !== 'countdown') return null;
  return Math.max(1, Math.ceil(ENCOUNTER_COUNTDOWN_SECONDS - state.elapsedSeconds)) as
    3 | 2 | 1;
}

export const hasEncounterPresentationChanged = (
  previous: EncounterState,
  next: EncounterState,
) =>
  previous.phase !== next.phase ||
  encounterCountdownValue(previous) !== encounterCountdownValue(next);
