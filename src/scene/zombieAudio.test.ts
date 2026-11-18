import { describe, expect, it } from 'vitest';
import { setupEffectAudio } from './effectAudio.test-support';
import { ZombieAttackAudio } from './zombieAudio';

describe('ZombieAttackAudio', () => {
  it('replaces an active bite voice and stops the latest voice', async () => {
    const { audio, ready, sources } = setupEffectAudio();
    await ready();
    const zombie = new ZombieAttackAudio(audio);
    zombie.playBite();
    expect(sources).toHaveLength(1);
    zombie.playBite();
    expect(sources).toHaveLength(2);
    expect(sources[0].stop).toHaveBeenCalledOnce();
    zombie.stop();
    expect(sources[1].stop).toHaveBeenCalledOnce();
  });

  it('isolates per-zombie cleanup and permits attack reentry after cleanup', async () => {
    const { audio, ready, sources } = setupEffectAudio();
    await ready();
    const first = new ZombieAttackAudio(audio),
      second = new ZombieAttackAudio(audio);
    first.playBite();
    second.playBite();
    first.stop();
    expect(sources[0].stop).toHaveBeenCalledOnce();
    expect(sources[1].stop).not.toHaveBeenCalled();
    first.playBite();
    expect(sources).toHaveLength(3);
    first.stop();
    expect(sources[2].stop).toHaveBeenCalledOnce();
  });
});
