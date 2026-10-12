import { describe, expect, it } from 'vitest';
import { impactVolumeAtDistance } from '../game/impacts';
import { setupEffectAudio } from './effectAudio.test-support';
import { WeaponAudio } from './weaponAudio';

describe('WeaponAudio', () => {
  it('keeps shot and empty-fire repetition independent and replaces each preceding voice', async () => {
    const { audio, ready, sources } = setupEffectAudio();
    await ready();
    const weapon = new WeaponAudio(audio);
    weapon.playShotgunBlast();
    weapon.playEmptyFire();
    weapon.playShotgunBlast();
    weapon.playEmptyFire();
    expect(sources).toHaveLength(4);
    expect(sources[0].stop).toHaveBeenCalledOnce();
    expect(sources[1].stop).toHaveBeenCalledOnce();
    expect(sources[2].buffer).toBe(sources[0].buffer);
    expect(sources[3].buffer).toBe(sources[1].buffer);
  });

  it('retains distance attenuation and distinct impact buffers', async () => {
    const { audio, ready, sources, gains } = setupEffectAudio();
    await ready();
    const weapon = new WeaponAudio(audio);
    weapon.playImpact('light', 4);
    weapon.playImpact('wall', 24);
    expect(gains[0].gain.value).toBe(impactVolumeAtDistance(4));
    expect(gains[1].gain.value).toBe(impactVolumeAtDistance(24));
    expect(sources[0].buffer).not.toBe(sources[1].buffer);
    expect(sources[0].stop).not.toHaveBeenCalled();
  });

  it('guards active reloads, allows reload after completion, and cleans up every weapon voice', async () => {
    const { audio, ready, sources, gains } = setupEffectAudio();
    await ready();
    const weapon = new WeaponAudio(audio);
    weapon.playReload();
    weapon.playReload();
    expect(sources).toHaveLength(1);
    sources[0].onended!();
    weapon.playReload();
    weapon.playShotgunBlast();
    weapon.playEmptyFire();
    weapon.playImpact('wall', 0);
    weapon.playImpact('light', 0);
    weapon.stop();
    expect(sources.slice(1).every((s) => s.stop.mock.calls.length === 1)).toBe(true);
    expect(gains.every((g) => g.disconnect.mock.calls.length === 1)).toBe(true);
  });
});
