import type { AnimationAction } from 'three';
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
