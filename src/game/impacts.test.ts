import { describe, expect, it } from 'vitest';
import {
  createArenaImpactState,
  hitBreakableLight,
  impactVolumeAtDistance,
  selectImpactSound,
} from './impacts';

describe('arena impacts', () => {
  it('breaks a light once and selects its destruction sound', () => {
    const initial = createArenaImpactState();
    const firstHit = hitBreakableLight(initial, 'north-wall-light');

    expect(firstHit.sound).toBe('light');
    expect(firstHit.state.brokenLightIds.has('north-wall-light')).toBe(true);
    expect(initial.brokenLightIds.size).toBe(0);

    const laterHit = hitBreakableLight(firstHit.state, 'north-wall-light');
    expect(laterHit).toEqual({ state: firstHit.state, sound: 'wall' });
  });

  it('restores every light in a fresh arena impact state', () => {
    const broken = hitBreakableLight(createArenaImpactState(), 'landmark-light').state;

    expect(broken.brokenLightIds.size).toBe(1);
    expect(createArenaImpactState().brokenLightIds.size).toBe(0);
  });

  it('prioritizes a light break over other pellet impacts for one shot', () => {
    expect(selectImpactSound(null, 'wall')).toBe('wall');
    expect(selectImpactSound('wall', 'light')).toBe('light');
    expect(selectImpactSound('light', 'wall')).toBe('light');
  });

  it('attenuates distant impact sounds without making them inaudible', () => {
    expect(impactVolumeAtDistance(2)).toBeGreaterThan(impactVolumeAtDistance(24));
    expect(impactVolumeAtDistance(100)).toBe(0.2);
    expect(impactVolumeAtDistance(Number.NaN)).toBe(1);
  });
});
