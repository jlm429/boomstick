import { LoopOnce, LoopRepeat, type AnimationAction } from 'three';
import type { ZombieMotionVariation } from '../game/zombie';

export const HIT_REACTION_TIME_SCALE = 3;

export type ZombieAnimation = 'idle' | 'run' | 'attack' | 'hit' | 'dying';
export type ZombieActions = Partial<Record<ZombieAnimation, AnimationAction>>;

const blends = new WeakMap<
  ZombieActions,
  { elapsed: number; duration: number; weights: [AnimationAction, number, number][] }
>();

export function updateZombieAnimationBlend(actions: ZombieActions, delta: number) {
  const blend = blends.get(actions);
  if (!blend) return;
  blend.elapsed += delta;
  const progress = Math.min(blend.elapsed / blend.duration, 1);
  for (const [action, start, end] of blend.weights) {
    action.setEffectiveWeight(start + (end - start) * progress);
    if (progress === 1 && end === 0) action.enabled = false;
  }
  if (progress === 1) blends.delete(actions);
}

export function applyZombieAnimationTimeScales(
  actions: ZombieActions,
  { speedMultiplier }: ZombieMotionVariation,
) {
  const runAction = actions.run;
  if (runAction) runAction.timeScale = speedMultiplier;
  const hitReactionAction = actions.hit;
  if (hitReactionAction) hitReactionAction.timeScale = HIT_REACTION_TIME_SCALE;
}

export function createInitialZombieWalkPhaseApplier(walkPhase: number) {
  let pending = true;
  return (action: AnimationAction) => {
    if (!pending) return;
    pending = false;
    action.time = walkPhase * action.getClip().duration;
  };
}

// Preserve the gait phase after a hit, and blend from the actual current weights
// when another transition interrupts a fade. Attack and hit clocks still reset.
export function transitionZombieAnimation(
  actions: ZombieActions,
  current: ZombieAnimation | null,
  next: ZombieAnimation,
  applyInitialWalkPhase: (action: AnimationAction) => void,
) {
  const nextAction = actions[next];
  if (!nextAction) return false;
  const blendSeconds = next === 'hit' ? 0.055 : next === 'run' ? 0.16 : 0.12;
  const weights: [AnimationAction, number, number][] = [];
  for (const action of Object.values(actions)) {
    if (!action) continue;
    const weight = action.isScheduled() ? action.getEffectiveWeight() : 0;
    const start = action === nextAction && current === null ? 1 : weight;
    action.setEffectiveWeight(start);
    weights.push([action, start, action === nextAction ? 1 : 0]);
  }
  const nextWeight = nextAction.getEffectiveWeight();
  const walkTime = nextAction.time;
  nextAction.reset().setEffectiveWeight(nextWeight);
  if (next === 'run') {
    nextAction.time = walkTime;
    applyInitialWalkPhase(nextAction);
  }
  nextAction.clampWhenFinished = next === 'hit' || next === 'dying';
  nextAction.setLoop(
    nextAction.clampWhenFinished ? LoopOnce : LoopRepeat,
    nextAction.clampWhenFinished ? 1 : Infinity,
  );
  blends.set(actions, { elapsed: 0, duration: blendSeconds, weights });
  nextAction.play();
  return true;
}
