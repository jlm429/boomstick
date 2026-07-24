import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WEAK_ZOMBIE_ATTACK, ZombieAttackController } from './zombieAttack';

describe('weak zombie attack cycle', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const setup = () => {
    let valid = true;
    let health = 100;
    const applyDamage = vi.fn((damage: number) => {
      health = Math.max(0, health - damage);
    });
    const controller = new ZombieAttackController(WEAK_ZOMBIE_ATTACK, {
      isHitValid: () => valid,
      applyDamage,
    });
    return {
      applyDamage,
      controller,
      health: () => health,
      setValid: (next: boolean) => {
        valid = next;
      },
    };
  };

  it('deals one configured hit after windup without frame-coupled contact damage', () => {
    const attack = setup();
    for (let frame = 0; frame < 60; frame += 1) attack.controller.update(true, true);

    expect(attack.health()).toBe(100);
    vi.advanceTimersByTime(WEAK_ZOMBIE_ATTACK.windupMs);
    expect(attack.applyDamage).toHaveBeenCalledOnce();
    expect(attack.applyDamage).toHaveBeenCalledWith(5);
    expect(attack.health()).toBe(95);
    expect(attack.controller.getPhase()).toBe('cooldown');
  });

  it('blocks immediate repeats until cooldown and a new windup complete', () => {
    const attack = setup();
    attack.controller.update(true, true);
    vi.advanceTimersByTime(WEAK_ZOMBIE_ATTACK.windupMs);

    vi.advanceTimersByTime(WEAK_ZOMBIE_ATTACK.cooldownMs - 1);
    attack.controller.update(true, true);
    expect(attack.applyDamage).toHaveBeenCalledOnce();

    vi.advanceTimersByTime(1 + WEAK_ZOMBIE_ATTACK.windupMs);
    expect(attack.applyDamage).toHaveBeenCalledTimes(2);
    expect(attack.health()).toBe(90);
  });

  it('cancels a pending hit when the player leaves during windup', () => {
    const attack = setup();
    attack.controller.update(true, true);
    vi.advanceTimersByTime(WEAK_ZOMBIE_ATTACK.windupMs - 1);
    attack.controller.update(false, true);
    vi.advanceTimersByTime(1);

    expect(attack.applyDamage).not.toHaveBeenCalled();
    expect(attack.controller.getPhase()).toBe('idle');
  });

  it('does not damage for dead, inactive, or disposed attackers', () => {
    const dead = setup();
    dead.controller.update(true, true);
    dead.setValid(false);
    vi.advanceTimersByTime(WEAK_ZOMBIE_ATTACK.windupMs);
    expect(dead.applyDamage).not.toHaveBeenCalled();

    const inactive = setup();
    inactive.controller.update(true, true);
    inactive.controller.update(true, false);
    vi.advanceTimersByTime(WEAK_ZOMBIE_ATTACK.windupMs);
    expect(inactive.applyDamage).not.toHaveBeenCalled();

    const disposed = setup();
    disposed.controller.update(true, true);
    disposed.controller.dispose();
    vi.advanceTimersByTime(WEAK_ZOMBIE_ATTACK.windupMs);
    expect(disposed.applyDamage).not.toHaveBeenCalled();
  });
});
