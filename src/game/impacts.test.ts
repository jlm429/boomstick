import { describe, expect, it } from 'vitest';
import { BREAKABLE_LIGHT_MAX_DISTANCE } from './constants';
import {
  createArenaImpactState,
  hitBreakableLight,
  impactVolumeAtDistance,
  selectImpactSound,
} from './impacts';

describe('arena impacts', () => {
  it('breaks a light once and selects its destruction sound', () => {
    const initial = createArenaImpactState();
    const firstHit = hitBreakableLight(initial, 'north-wall-light', 8);

    expect(firstHit.sound).toBe('light');
    expect(firstHit.state.brokenLightIds.has('north-wall-light')).toBe(true);
    expect(initial.brokenLightIds.size).toBe(0);

    const laterHit = hitBreakableLight(firstHit.state, 'north-wall-light', 8);
    expect(laterHit).toEqual({ state: firstHit.state, sound: 'wall' });
  });

  it('restores every light in a fresh arena impact state', () => {
    const broken = hitBreakableLight(createArenaImpactState(), 'landmark-light', 8).state;

    expect(broken.brokenLightIds.size).toBe(1);
    expect(createArenaImpactState().brokenLightIds.size).toBe(0);
  });

  it('breaks a light at the maximum destruction distance', () => {
    const initial = createArenaImpactState();
    const impact = hitBreakableLight(initial, 'east-wall-light', BREAKABLE_LIGHT_MAX_DISTANCE);

    expect(impact.sound).toBe('light');
    expect(impact.state.brokenLightIds.has('east-wall-light')).toBe(true);
  });

  it('keeps a light intact beyond the maximum destruction distance', () => {
    const initial = createArenaImpactState();
    const impact = hitBreakableLight(
      initial,
      'east-wall-light',
      BREAKABLE_LIGHT_MAX_DISTANCE + 0.001,
    );

    expect(impact).toEqual({ state: initial, sound: 'wall' });
    expect(impact.state.brokenLightIds.size).toBe(0);
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
