import { AnimationClip, AnimationMixer, Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import {
  HIT_REACTION_TIME_SCALE,
  applyZombieAnimationTimeScales,
  createInitialZombieWalkPhaseApplier,
  type ZombieActions,
  type ZombieAnimation,
} from './zombieAnimation';

describe('zombie animation time scales', () => {
  it('speeds up only the hit-reaction action with the centralized scale', () => {
    const mixer = new AnimationMixer(new Object3D());
    const animationNames: ZombieAnimation[] = ['idle', 'run', 'attack', 'hit', 'dying'];
    const actions = Object.fromEntries(
      animationNames.map((name) => [name, mixer.clipAction(new AnimationClip(name, 1))]),
    ) as ZombieActions;

    const variation = { walkPhase: 0.75, speedMultiplier: 1.04 };
    applyZombieAnimationTimeScales(actions, variation);

    expect(HIT_REACTION_TIME_SCALE).toBe(1.5);
    expect(actions.run?.timeScale).toBe(variation.speedMultiplier);
    expect(actions.hit?.timeScale).toBe(HIT_REACTION_TIME_SCALE);
    for (const name of ['idle', 'attack', 'dying'] as const) {
      expect(actions[name]?.timeScale).toBe(1);
    }
  });

  it('applies the sampled walk phase across the full clip duration exactly once', () => {
    const mixer = new AnimationMixer(new Object3D());
    const run = mixer.clipAction(new AnimationClip('run', 4));
    const applyInitialWalkPhase = createInitialZombieWalkPhaseApplier(0.75);

    applyInitialWalkPhase(run);
    expect(run.time).toBe(3);

    run.time = 0.25;
    applyInitialWalkPhase(run);
    expect(run.time).toBe(0.25);
  });
});
