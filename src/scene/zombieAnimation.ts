import { LoopOnce, LoopRepeat, type AnimationAction } from 'three';
import type { ZombieMotionVariation } from '../game/zombie';

export const HIT_REACTION_TIME_SCALE = 3;

export type ZombieAnimation = 'idle' | 'run' | 'attack' | 'hit' | 'dying';
export type ZombieActions = Partial<Record<ZombieAnimation, AnimationAction>>;

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
  for (const [name, action] of Object.entries(actions)) {
    if (name === next || !action) continue;
    const weight = action.getEffectiveWeight();
    if (weight > 0) action.setEffectiveWeight(weight).fadeOut(blendSeconds);
  }
  const walkTime = nextAction.time;
  nextAction.reset().setEffectiveWeight(1);
  if (next === 'run') {
    nextAction.time = walkTime;
    applyInitialWalkPhase(nextAction);
  }
  nextAction.clampWhenFinished = next === 'hit' || next === 'dying';
  nextAction.setLoop(
    nextAction.clampWhenFinished ? LoopOnce : LoopRepeat,
    nextAction.clampWhenFinished ? 1 : Infinity,
  );
  if (current !== null && current !== next) nextAction.fadeIn(blendSeconds);
  nextAction.play();
  return true;
}
