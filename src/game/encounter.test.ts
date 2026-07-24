import { describe, expect, it } from 'vitest';
import { ARENA_TARGETS } from './targets';
import {
  advanceEncounterCountdown,
  areAllTrainingZombiesRemoved,
  areAllTrainingTargetsDepleted,
  completeEncounter,
  createEncounterState,
  createTrainingTargetHealth,
  encounterCountdownValue,
  recordTrainingZombieRemoval,
  startEncounterCountdown,
  trainingTargetsHaveCollision,
  type EncounterState,
} from './encounter';
import { TRAINING_ZOMBIE_SPAWNS, type TrainingZombieId } from './zombie';

function advanceFrames(state: EncounterState, frameCount: number) {
  let nextState = state;
  for (let frame = 0; frame < frameCount; frame += 1) {
    nextState = advanceEncounterCountdown(nextState, 1 / 60);
  }
  return nextState;
}

describe('training encounter transition', () => {
  it('requires every existing target to be depleted', () => {
    const initialHealth = createTrainingTargetHealth();
    expect(areAllTrainingTargetsDepleted(initialHealth)).toBe(false);

    const oneTargetStillActive = Object.fromEntries(
      ARENA_TARGETS.map(({ id }, index) => [id, index === 0 ? 1 : 0]),
    );
    expect(areAllTrainingTargetsDepleted(oneTargetStillActive)).toBe(false);

    const allTargetsDepleted = Object.fromEntries(ARENA_TARGETS.map(({ id }) => [id, 0]));
    expect(areAllTrainingTargetsDepleted(allTargetsDepleted)).toBe(true);
  });

  it('starts the countdown only once after training completes', () => {
    const allTargetsDepleted = Object.fromEntries(ARENA_TARGETS.map(({ id }) => [id, 0]));
    const countdown = startEncounterCountdown(createEncounterState(), allTargetsDepleted);

    expect(countdown).toEqual({ phase: 'countdown', elapsedSeconds: 0 });
    expect(startEncounterCountdown(countdown, allTargetsDepleted)).toBe(countdown);
  });

  it('counts down 3, 2, 1 before spawning the zombie encounter', () => {
    const allTargetsDepleted = Object.fromEntries(ARENA_TARGETS.map(({ id }) => [id, 0]));
    let encounter = startEncounterCountdown(createEncounterState(), allTargetsDepleted);

    expect(encounterCountdownValue(encounter)).toBe(3);
    encounter = advanceFrames(encounter, 60);
    expect(encounterCountdownValue(encounter)).toBe(2);
    encounter = advanceFrames(encounter, 60);
    expect(encounterCountdownValue(encounter)).toBe(1);
    encounter = advanceFrames(encounter, 60);
    expect(encounter).toEqual({ phase: 'zombie' });
    expect(advanceEncounterCountdown(encounter, 10)).toBe(encounter);
  });

  it('does not skip countdown values after a large frame delta', () => {
    const allTargetsDepleted = Object.fromEntries(ARENA_TARGETS.map(({ id }) => [id, 0]));
    let encounter = startEncounterCountdown(createEncounterState(), allTargetsDepleted);

    encounter = advanceEncounterCountdown(encounter, 10);
    expect(encounterCountdownValue(encounter)).toBe(3);

    encounter = advanceFrames(encounter, 60);
    expect(encounterCountdownValue(encounter)).toBe(2);

    encounter = advanceEncounterCountdown(encounter, 10);
    expect(encounterCountdownValue(encounter)).toBe(2);
    encounter = advanceFrames(encounter, 60);
    expect(encounterCountdownValue(encounter)).toBe(1);

    encounter = advanceEncounterCountdown(encounter, 10);
    expect(encounterCountdownValue(encounter)).toBe(1);
    encounter = advanceFrames(encounter, 60);
    expect(encounter).toEqual({ phase: 'zombie' });
  });

  it('creates a fresh training state for restart', () => {
    const restarted = createEncounterState();
    expect(restarted).toEqual({ phase: 'training' });
    expect(encounterCountdownValue(restarted)).toBeNull();
  });

  it('completes only after the active zombie has been removed', () => {
    const training = createEncounterState();
    expect(completeEncounter(training)).toBe(training);
    expect(completeEncounter({ phase: 'countdown', elapsedSeconds: 2 })).toEqual({
      phase: 'countdown',
      elapsedSeconds: 2,
    });
    expect(completeEncounter({ phase: 'zombie' })).toEqual({ phase: 'complete' });
  });

  it('completes after five distinct removals and ignores duplicate removal callbacks', () => {
    let removedZombieIds: ReadonlySet<TrainingZombieId> = new Set();

    for (const { id } of TRAINING_ZOMBIE_SPAWNS.slice(0, -1)) {
      removedZombieIds = recordTrainingZombieRemoval(removedZombieIds, id);
    }
    expect(areAllTrainingZombiesRemoved(removedZombieIds)).toBe(false);

    const duplicateRemoval = recordTrainingZombieRemoval(
      removedZombieIds,
      TRAINING_ZOMBIE_SPAWNS[0].id,
    );
    expect(duplicateRemoval).toBe(removedZombieIds);
    expect(duplicateRemoval).toHaveProperty('size', 4);

    removedZombieIds = recordTrainingZombieRemoval(
      removedZombieIds,
      TRAINING_ZOMBIE_SPAWNS.at(-1)!.id,
    );
    expect(areAllTrainingZombiesRemoved(removedZombieIds)).toBe(true);
    expect(removedZombieIds).toHaveProperty('size', 5);
  });

  it('restarts with no removals so the same five configured zombies can remount once', () => {
    let removedZombieIds: ReadonlySet<TrainingZombieId> = new Set();
    for (const { id } of TRAINING_ZOMBIE_SPAWNS) {
      removedZombieIds = recordTrainingZombieRemoval(removedZombieIds, id);
    }
    expect(areAllTrainingZombiesRemoved(removedZombieIds)).toBe(true);

    const restartedZombieIds: ReadonlySet<TrainingZombieId> = new Set();
    expect(areAllTrainingZombiesRemoved(restartedZombieIds)).toBe(false);
    expect(TRAINING_ZOMBIE_SPAWNS).toHaveLength(5);
    expect(new Set(TRAINING_ZOMBIE_SPAWNS.map(({ id }) => id))).toHaveProperty('size', 5);
  });

  it('removes depleted target collision before the zombie starts chasing', () => {
    expect(trainingTargetsHaveCollision({ phase: 'training' })).toBe(true);
    expect(trainingTargetsHaveCollision({ phase: 'countdown', elapsedSeconds: 2 })).toBe(true);
    expect(trainingTargetsHaveCollision({ phase: 'zombie' })).toBe(false);
    expect(trainingTargetsHaveCollision({ phase: 'complete' })).toBe(false);
  });
});
