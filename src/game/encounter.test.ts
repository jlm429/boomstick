import { describe, expect, it } from 'vitest';
import { ARENA_TARGETS } from './targets';
import {
  advanceEncounterCountdown,
  areAllTrainingZombiesRemoved,
  completeEncounter,
  createEncounterState,
  createTrainingTargetHealth,
  encounterCountdownValue,
  hasEncounterPresentationChanged,
  recordTrainingZombieRemoval,
  updateTrainingProgress,
  trainingTargetsHaveCollision,
  type EncounterState,
} from './encounter';
import { TRAINING_ZOMBIE_SPAWNS, type TrainingZombieId } from './zombie';

function advanceFrames(state: EncounterState, frameCount: number, rendererReady = true) {
  let nextState = state;
  for (let frame = 0; frame < frameCount; frame += 1) {
    nextState = advanceEncounterCountdown(nextState, 1 / 60, rendererReady);
  }
  return nextState;
}

describe('training encounter transition', () => {
  it('counts each cleared target once and leaves partial hits out of the HUD progress', () => {
    const training = createEncounterState();
    const [first, second] = ARENA_TARGETS;
    const health = { ...createTrainingTargetHealth(), [first.id]: 0, [second.id]: 1 };
    const progress = updateTrainingProgress(training, health);
    expect(progress).toEqual({ phase: 'training', targetsCleared: 1 });
    expect(hasEncounterPresentationChanged(training, progress)).toBe(true);
    expect(updateTrainingProgress(progress, { ...health, [second.id]: 0.5 })).toBe(progress);
    expect(updateTrainingProgress(training, { [first.id]: 0 })).toEqual(progress);
  });

  it('starts the countdown only once after training completes', () => {
    const allTargetsDepleted = Object.fromEntries(ARENA_TARGETS.map(({ id }) => [id, 0]));
    const countdown = updateTrainingProgress(createEncounterState(), allTargetsDepleted);

    expect(countdown).toEqual({ phase: 'countdown', elapsedSeconds: 0 });
    expect(updateTrainingProgress(countdown, allTargetsDepleted)).toBe(countdown);
  });

  it('counts down 3, 2, 1 before spawning the zombie encounter', () => {
    const allTargetsDepleted = Object.fromEntries(ARENA_TARGETS.map(({ id }) => [id, 0]));
    let encounter = updateTrainingProgress(createEncounterState(), allTargetsDepleted);

    expect(encounterCountdownValue(encounter)).toBe(3);
    encounter = advanceFrames(encounter, 60);
    expect(encounterCountdownValue(encounter)).toBe(2);
    encounter = advanceFrames(encounter, 60);
    expect(encounterCountdownValue(encounter)).toBe(1);
    encounter = advanceFrames(encounter, 60);
    expect(encounter).toEqual({ phase: 'zombie' });
    expect(advanceEncounterCountdown(encounter, 10, true)).toBe(encounter);
  });

  it('reports renderer wait until rendering is ready or the grace period ends', () => {
    const cleared = Object.fromEntries(ARENA_TARGETS.map(({ id }) => [id, 0]));
    const countdown = updateTrainingProgress(createEncounterState(), cleared);
    const waiting = advanceFrames(countdown, 180, false);

    expect(encounterCountdownValue(advanceFrames(countdown, 179, false))).toBe(1);
    expect(encounterCountdownValue(waiting)).toBe('waiting');
    expect(hasEncounterPresentationChanged(advanceFrames(countdown, 179, false), waiting)).toBe(
      true,
    );
    expect(hasEncounterPresentationChanged(waiting, advanceFrames(waiting, 1, false))).toBe(
      false,
    );
    expect(trainingTargetsHaveCollision(waiting)).toBe(true);
    expect(advanceFrames(waiting, 1)).toEqual({ phase: 'zombie' });
    expect(advanceFrames(waiting, 119, false).phase).toBe('countdown');
    expect(advanceFrames(waiting, 120, false)).toEqual({ phase: 'zombie' });
  });

  it('does not skip countdown values after a large frame delta', () => {
    const allTargetsDepleted = Object.fromEntries(ARENA_TARGETS.map(({ id }) => [id, 0]));
    let encounter = updateTrainingProgress(createEncounterState(), allTargetsDepleted);

    encounter = advanceEncounterCountdown(encounter, 10, true);
    expect(encounterCountdownValue(encounter)).toBe(3);

    encounter = advanceFrames(encounter, 60);
    expect(encounterCountdownValue(encounter)).toBe(2);

    encounter = advanceEncounterCountdown(encounter, 10, true);
    expect(encounterCountdownValue(encounter)).toBe(2);
    encounter = advanceFrames(encounter, 60);
    expect(encounterCountdownValue(encounter)).toBe(1);

    encounter = advanceEncounterCountdown(encounter, 10, true);
    expect(encounterCountdownValue(encounter)).toBe(1);
    encounter = advanceFrames(encounter, 60);
    expect(encounter).toEqual({ phase: 'zombie' });
  });

  it('creates a fresh training state for restart', () => {
    const restarted = createEncounterState();
    expect(restarted).toEqual({ phase: 'training', targetsCleared: 0 });
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
    expect(trainingTargetsHaveCollision({ phase: 'training', targetsCleared: 0 })).toBe(true);
    expect(trainingTargetsHaveCollision({ phase: 'countdown', elapsedSeconds: 2 })).toBe(true);
    expect(trainingTargetsHaveCollision({ phase: 'zombie' })).toBe(false);
    expect(trainingTargetsHaveCollision({ phase: 'complete' })).toBe(false);
  });
});
