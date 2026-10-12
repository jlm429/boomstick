import { describe, expect, it } from 'vitest';
import { setupEffectAudio } from './effectAudio.test-support';
import { ZombieAttackAudio } from './zombieAudio';

describe('ZombieAttackAudio', () => {
  it('plays only on attack entry and animation wrap and stops on attack exit', async () => {
    const { audio, ready, sources } = setupEffectAudio();
    await ready();
    const zombie = new ZombieAttackAudio(audio);
    zombie.synchronizeAttackCycle();
    expect(sources).toHaveLength(0);
    zombie.enterAttack();
    zombie.enterAttack();
    expect(sources).toHaveLength(1);
    zombie.synchronizeAttackCycle();
    expect(sources).toHaveLength(2);
    expect(sources[0].stop).toHaveBeenCalledOnce();
    zombie.leaveAttack();
    expect(sources[1].stop).toHaveBeenCalledOnce();
    zombie.synchronizeAttackCycle();
    expect(sources).toHaveLength(2);
  });

  it('isolates per-zombie cleanup and permits attack reentry after cleanup', async () => {
    const { audio, ready, sources } = setupEffectAudio();
    await ready();
    const first = new ZombieAttackAudio(audio),
      second = new ZombieAttackAudio(audio);
    first.enterAttack();
    second.enterAttack();
    first.stop();
    expect(sources[0].stop).toHaveBeenCalledOnce();
    expect(sources[1].stop).not.toHaveBeenCalled();
    first.enterAttack();
    expect(sources).toHaveLength(3);
    first.stop();
    expect(sources[2].stop).toHaveBeenCalledOnce();
  });
});
