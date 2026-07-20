import { describe, expect, it } from 'vitest';
import { ARENA_TARGETS } from './targets';
import {
  advanceEncounterCountdown,
  areAllTrainingTargetsDepleted,
  createEncounterState,
  createTrainingTargetHealth,
  encounterCountdownValue,
  startEncounterCountdown,
  type EncounterState,
} from './encounter';

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

  it('counts down 3, 2, 1 before spawning one zombie encounter', () => {
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
});
