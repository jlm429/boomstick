import { targetDamageAt } from './targets';

export const ZOMBIE_MAX_HEALTH = 300;
export const ZOMBIE_MOVE_SPEED = 3.2;
export const ZOMBIE_STOP_DISTANCE = 1.7;
export const ZOMBIE_SPAWN = [7, 0.03, -14] as const;

export type ZombieState = Readonly<{
  health: number;
  dead: boolean;
}>;

export type ZombieHitResult = Readonly<{
  state: ZombieState;
  damage: number;
  reacted: boolean;
}>;

export const createZombieState = (): ZombieState => ({
  health: ZOMBIE_MAX_HEALTH,
  dead: false,
});

export function hitZombie(state: ZombieState, distance: number): ZombieHitResult {
  if (state.dead || state.health <= 0) return { state, damage: 0, reacted: false };

  const damage = targetDamageAt(distance, { x: 0, y: 0 });
  const health = Math.max(0, state.health - damage);
  return {
    state: { health, dead: health === 0 },
    damage: state.health - health,
    reacted: true,
  };
}
