import { describe, expect, it } from 'vitest';
import { ZOMBIE_MAX_HEALTH, createZombieState, hitZombie } from './zombie';

describe('zombie health', () => {
  it('starts alive at the tuneable maximum health', () => {
    expect(createZombieState()).toEqual({ health: ZOMBIE_MAX_HEALTH, dead: false });
  });

  it('takes shotgun damage and enters a permanent death state at zero health', () => {
    let zombie = createZombieState();
    const firstHit = hitZombie(zombie, 8);
    expect(firstHit.reacted).toBe(true);
    expect(firstHit.damage).toBeGreaterThan(0);
    expect(firstHit.state.health).toBeLessThan(ZOMBIE_MAX_HEALTH);

    zombie = firstHit.state;
    while (!zombie.dead) zombie = hitZombie(zombie, 0).state;

    expect(zombie).toEqual({ health: 0, dead: true });
    expect(hitZombie(zombie, 0)).toEqual({ state: zombie, damage: 0, reacted: false });
  });
});
