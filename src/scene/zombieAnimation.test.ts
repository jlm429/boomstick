import { AnimationClip, AnimationMixer, Object3D, VectorKeyframeTrack } from 'three';
import { describe, expect, it } from 'vitest';
import {
  HIT_REACTION_TIME_SCALE,
  transitionZombieAnimation,
  updateZombieAnimationBlend,
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
    const update = (delta: number) => {
      updateZombieAnimationBlend(actions, delta);
      mixer.update(delta);
    };
    return { root, mixer, actions, update, initial: createInitialZombieWalkPhaseApplier(0.5) };
  }

  it('blends interrupted transitions from the live pose without a bind-pose flash', () => {
    const { root, mixer, actions, update, initial } = fixture();
    transitionZombieAnimation(actions, null, 'idle', initial);
    update(0.01);
    expect(root.position.y).toBe(1);
    transitionZombieAnimation(actions, 'idle', 'run', initial);
    update(0.04);
    expect(root.position.y).toBeGreaterThan(1);
    expect(root.position.y).toBeLessThan(2);
    transitionZombieAnimation(actions, 'run', 'attack', initial);
    for (let i = 0; i < 12; i++) {
      update(0.01);
      expect(root.position.y).toBeGreaterThanOrEqual(1);
      expect(root.position.y).toBeLessThanOrEqual(3.001);
    }
    expect(root.position.y).toBeCloseTo(3);
    expect(actions.attack!.timeScale).toBe(1);
    expect(actions.attack!.time).toBeCloseTo(0.12);
    mixer.stopAllAction();
  });

  it('resumes the walking phase and retains hit/death duration and repeat-hit reset semantics', () => {
    const { mixer, actions, update, initial } = fixture();
    transitionZombieAnimation(actions, null, 'run', initial);
    expect(actions.run!.time).toBe(0.5);
    update(0.08);
    transitionZombieAnimation(actions, 'run', 'hit', initial);
    update(0.06);
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
    update(1.1);
    expect(actions.dying!.time).toBe(1);
    expect(actions.dying!.paused).toBe(true);
    mixer.stopAllAction();
  });

  const animationNames = ['idle', 'run', 'attack', 'hit', 'dying'] as const;

  it('resets a repeated hit clock without discarding an unfinished blend', () => {
    const { root, mixer, actions, update, initial } = fixture();
    transitionZombieAnimation(actions, null, 'attack', initial);
    update(0.01);
    transitionZombieAnimation(actions, 'attack', 'hit', initial);
    update(0.055 / 4);
    const pose = root.position.y;
    transitionZombieAnimation(actions, 'hit', 'hit', initial);
    expect(actions.hit!.time).toBe(0);
    expect(actions.hit!.getEffectiveWeight()).toBeCloseTo(0.25);
    expect(actions.attack!.getEffectiveWeight()).toBeCloseTo(0.75);
    update(0);
    expect(root.position.y).toBeCloseTo(pose);
    update(0.055);
    expect(root.position.y).toBeCloseTo(4);
    expect(actions.hit!.time).toBeCloseTo(0.165);
    mixer.stopAllAction();
  });

  const reversals = animationNames.flatMap((from) =>
    animationNames.filter((to) => to !== from).map((to) => ({ from, to })),
  );

  it.each(reversals)(
    'preserves live contributions during $from -> $to -> $from',
    ({ from, to }) => {
      const { root, mixer, actions, update, initial } = fixture();
      transitionZombieAnimation(actions, null, from, initial);
      update(0.01);
      transitionZombieAnimation(actions, from, to, initial);
      const duration = to === 'hit' ? 0.055 : to === 'run' ? 0.16 : 0.12;
      update(duration / 4);
      const pose = root.position.y;
      const walkTime = actions.run!.time;
      expect(actions[from]!.getEffectiveWeight()).toBeCloseTo(0.75);
      expect(actions[to]!.getEffectiveWeight()).toBeCloseTo(0.25);

      transitionZombieAnimation(actions, to, from, initial);
      expect(actions[from]!.getEffectiveWeight()).toBeCloseTo(0.75);
      expect(actions[to]!.getEffectiveWeight()).toBeCloseTo(0.25);
      expect(actions[from]!.time).toBe(from === 'run' ? walkTime : 0);
      update(0);
      expect(root.position.y).toBeCloseTo(pose);
      const destination = animationNames.indexOf(from) + 1;
      for (let frame = 0; frame < 16; frame++) {
        update(0.01);
        const total = Object.values(actions).reduce(
          (sum, action) => sum + action.getEffectiveWeight(),
          0,
        );
        expect(total).toBeCloseTo(1);
        expect(root.position.y).toBeGreaterThanOrEqual(Math.min(pose, destination) - 0.00001);
        expect(root.position.y).toBeLessThanOrEqual(Math.max(pose, destination) + 0.00001);
      }
      expect(root.position.y).toBeCloseTo(destination);
      expect(actions.attack!.timeScale).toBe(1);
      expect(actions.hit!.timeScale).toBe(HIT_REACTION_TIME_SCALE);
      expect(actions.run!.timeScale).toBe(1.04);
      if (from === 'attack') expect(actions.attack!.time).toBeCloseTo(0.16);
      if (from === 'hit') expect(actions.hit!.time).toBeCloseTo(0.48);
      mixer.stopAllAction();
    },
  );
});
