import { describe, expect, it, vi } from 'vitest';
import zombieBitingUrl from '../assets/audio/zombie_biting.mp3';
import { ZombieAttackAudio } from './zombieAudio';

type AudioStub = {
  currentTime: number;
  pause: ReturnType<typeof vi.fn>;
  play: ReturnType<typeof vi.fn>;
};

const setup = () => {
  const audio: AudioStub = {
    currentTime: 4,
    pause: vi.fn(),
    play: vi.fn().mockResolvedValue(undefined),
  };
  const createAudio = vi.fn(() => audio as unknown as HTMLAudioElement);
  return { audio, createAudio, zombieAudio: new ZombieAttackAudio(createAudio) };
};

describe('ZombieAttackAudio', () => {
  it('creates one bite source and starts without restarting every update', () => {
    const { audio, createAudio, zombieAudio } = setup();

    zombieAudio.enterAttack();
    zombieAudio.enterAttack();

    expect(createAudio).toHaveBeenCalledOnce();
    expect(createAudio).toHaveBeenCalledWith(zombieBitingUrl);
    expect(audio.play).toHaveBeenCalledOnce();
    expect(audio.currentTime).toBe(0);
  });

  it('synchronizes bite playback once for each reported attack animation cycle', () => {
    const { audio, zombieAudio } = setup();

    zombieAudio.enterAttack();
    audio.currentTime = 1.5;
    zombieAudio.synchronizeAttackCycle();

    expect(audio.play).toHaveBeenCalledTimes(2);
    expect(audio.currentTime).toBe(0);
  });

  it('ignores cycle synchronization outside attack', () => {
    const { audio, zombieAudio } = setup();

    zombieAudio.synchronizeAttackCycle();

    expect(audio.play).not.toHaveBeenCalled();
  });

  it('stops and rewinds immediately when attack ends or the owner is cleaned up', () => {
    const { audio, zombieAudio } = setup();

    zombieAudio.enterAttack();
    zombieAudio.leaveAttack();
    expect(audio.pause).toHaveBeenCalledOnce();
    expect(audio.currentTime).toBe(0);

    audio.currentTime = 2;
    zombieAudio.stop();
    expect(audio.pause).toHaveBeenCalledTimes(2);
    expect(audio.currentTime).toBe(0);
  });

  it('handles blocked browser playback without an unhandled failure', async () => {
    const { audio, zombieAudio } = setup();
    audio.play.mockRejectedValueOnce(new Error('playback blocked'));

    zombieAudio.enterAttack();

    await expect(Promise.resolve()).resolves.toBeUndefined();
  });
});
