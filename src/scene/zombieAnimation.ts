import type { AnimationAction } from 'three';

export const HIT_REACTION_TIME_SCALE = 1.5;

export type ZombieAnimation = 'idle' | 'run' | 'attack' | 'hit' | 'dying';
export type ZombieActions = Partial<Record<ZombieAnimation, AnimationAction>>;

export function applyZombieAnimationTimeScales(actions: ZombieActions) {
  const hitReactionAction = actions.hit;
  if (hitReactionAction) hitReactionAction.timeScale = HIT_REACTION_TIME_SCALE;
}
