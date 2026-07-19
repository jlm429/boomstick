import { describe, expect, it, vi } from 'vitest';
import emptyFireUrl from '../assets/audio/gun_empty_short.mp3';
import reloadUrl from '../assets/audio/reload.mp3';
import shotgunBlastUrl from '../assets/audio/shotgun_blast_short.mp3';
import { WeaponAudio } from './weaponAudio';

type AudioStub = {
  currentTime: number;
  paused: boolean;
  pause: ReturnType<typeof vi.fn>;
  play: ReturnType<typeof vi.fn>;
};

const setup = () => {
  const audioBySource = new Map<string, AudioStub>();
  const createAudio = vi.fn((source: string) => {
    const audio: AudioStub = {
      currentTime: 4,
      paused: true,
      pause: vi.fn(),
      play: vi.fn().mockResolvedValue(undefined),
    };
    audioBySource.set(source, audio);
    return audio as unknown as HTMLAudioElement;
  });
  const weaponAudio = new WeaponAudio(createAudio);

  return { audioBySource, createAudio, weaponAudio };
};

describe('WeaponAudio', () => {
  it('creates and reuses one audio object for each weapon sound', () => {
    const { audioBySource, createAudio, weaponAudio } = setup();

    weaponAudio.playShotgunBlast();
    weaponAudio.playShotgunBlast();
    weaponAudio.playEmptyFire();
    weaponAudio.playEmptyFire();

    expect(createAudio).toHaveBeenCalledTimes(3);
    expect(createAudio).toHaveBeenCalledWith(emptyFireUrl);
    expect(createAudio).toHaveBeenCalledWith(reloadUrl);
    expect(createAudio).toHaveBeenCalledWith(shotgunBlastUrl);
    expect(audioBySource.get(shotgunBlastUrl)?.play).toHaveBeenCalledTimes(2);
    expect(audioBySource.get(emptyFireUrl)?.play).toHaveBeenCalledTimes(2);
  });

  it('starts reload audio once and does not restart it while it is playing', () => {
    const { audioBySource, weaponAudio } = setup();
    const reload = audioBySource.get(reloadUrl)!;

    weaponAudio.playReload();
    reload.paused = false;
    weaponAudio.playReload();

    expect(reload.play).toHaveBeenCalledTimes(1);
    expect(reload.currentTime).toBe(0);
  });

  it('handles browser playback rejection without an unhandled failure', async () => {
    const { audioBySource, weaponAudio } = setup();
    const blast = audioBySource.get(shotgunBlastUrl)!;
    vi.mocked(blast.play).mockRejectedValueOnce(new Error('playback blocked'));

    weaponAudio.playShotgunBlast();

    await expect(Promise.resolve()).resolves.toBeUndefined();
  });

  it('stops and rewinds every owned audio object', () => {
    const { audioBySource, weaponAudio } = setup();

    weaponAudio.stop();

    for (const audio of audioBySource.values()) {
      expect(audio.pause).toHaveBeenCalledOnce();
      expect(audio.currentTime).toBe(0);
    }
  });
});
