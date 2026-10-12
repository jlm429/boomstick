import { AnimationClip, AnimationMixer, Object3D, VectorKeyframeTrack } from 'three';
import { describe, expect, it } from 'vitest';
import {
  HIT_REACTION_TIME_SCALE,
  transitionZombieAnimation,
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

    const hitAction = actions.hit;
    expect(hitAction).toBeDefined();
    if (!hitAction) throw new Error('Expected hit animation action');

    expect(HIT_REACTION_TIME_SCALE).toBe(3);
    expect(actions.run?.timeScale).toBe(variation.speedMultiplier);
    expect(hitAction.timeScale).toBe(HIT_REACTION_TIME_SCALE);
    expect(hitAction.getClip().duration / hitAction.timeScale).toBe(
      hitAction.getClip().duration / 1.5 / 2,
    );
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

describe('zombie animation transitions', () => {
  function fixture() {
    const root = new Object3D();
    root.position.y = 100;
    const mixer = new AnimationMixer(root);
    const actions = Object.fromEntries(
      (['idle', 'run', 'attack', 'hit', 'dying'] as const).map((name, index) => [
        name,
        mixer.clipAction(
          new AnimationClip(name, 1, [
            new VectorKeyframeTrack('.position', [0, 1], [0, index + 1, 0, 0, index + 1, 0]),
          ]),
        ),
      ]),
    ) as ZombieActions;
    applyZombieAnimationTimeScales(actions, { speedMultiplier: 1.04, walkPhase: 0.5 });
    return { root, mixer, actions, initial: createInitialZombieWalkPhaseApplier(0.5) };
  }

  it('blends interrupted transitions from the live pose without a bind-pose flash', () => {
    const { root, mixer, actions, initial } = fixture();
    transitionZombieAnimation(actions, null, 'idle', initial);
    mixer.update(0.01);
    expect(root.position.y).toBe(1);
    transitionZombieAnimation(actions, 'idle', 'run', initial);
    mixer.update(0.04);
    expect(root.position.y).toBeGreaterThan(1);
    expect(root.position.y).toBeLessThan(2);
    transitionZombieAnimation(actions, 'run', 'attack', initial);
    for (let i = 0; i < 12; i++) {
      mixer.update(0.01);
      expect(root.position.y).toBeGreaterThanOrEqual(1);
      expect(root.position.y).toBeLessThanOrEqual(3.001);
    }
    expect(root.position.y).toBeCloseTo(3);
    expect(actions.attack!.timeScale).toBe(1);
    expect(actions.attack!.time).toBeCloseTo(0.12);
    mixer.stopAllAction();
  });

  it('resumes the walking phase and retains hit/death duration and repeat-hit reset semantics', () => {
    const { mixer, actions, initial } = fixture();
    transitionZombieAnimation(actions, null, 'run', initial);
    expect(actions.run!.time).toBe(0.5);
    mixer.update(0.08);
    transitionZombieAnimation(actions, 'run', 'hit', initial);
    mixer.update(0.06);
    const walkTime = actions.run!.time;
    transitionZombieAnimation(actions, 'hit', 'hit', initial);
    expect(actions.hit!.time).toBe(0);
    expect(actions.hit!.getEffectiveWeight()).toBe(1);
    expect(actions.hit!.timeScale).toBe(3);
    expect(actions.hit!.clampWhenFinished).toBe(true);
    transitionZombieAnimation(actions, 'hit', 'run', initial);
    expect(actions.run!.time).toBe(walkTime);
    expect(actions.run!.timeScale).toBe(1.04);
    transitionZombieAnimation(actions, 'run', 'dying', initial);
    expect(actions.dying!.time).toBe(0);
    expect(actions.dying!.timeScale).toBe(1);
    expect(actions.dying!.clampWhenFinished).toBe(true);
    mixer.update(1.1);
    expect(actions.dying!.time).toBe(1);
    expect(actions.dying!.paused).toBe(true);
    mixer.stopAllAction();
  });
});
