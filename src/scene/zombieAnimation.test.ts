import { AnimationClip, AnimationMixer, Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import {
  HIT_REACTION_TIME_SCALE,
  applyZombieAnimationTimeScales,
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

    applyZombieAnimationTimeScales(actions);

    expect(HIT_REACTION_TIME_SCALE).toBe(1.5);
    expect(actions.hit?.timeScale).toBe(HIT_REACTION_TIME_SCALE);
    for (const name of ['idle', 'run', 'attack', 'dying'] as const) {
      expect(actions[name]?.timeScale).toBe(1);
    }
  });
});
