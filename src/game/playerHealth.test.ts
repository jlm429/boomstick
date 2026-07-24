import { describe, expect, it } from 'vitest';
import {
  CRITICAL_HEALTH_THRESHOLD,
  DEATH_CAMERA_DROP,
  DEATH_CAMERA_ROLL,
  DEATH_FADE_START_SECONDS,
  DEATH_SEQUENCE_SECONDS,
  PLAYER_MAX_HEALTH,
  clampPlayerHealth,
  deathVisualAt,
  healthBandFor,
  isCriticalPlayerHealth,
} from './playerHealth';

describe('player health presentation rules', () => {
  it('clamps health to the supported range', () => {
    expect(clampPlayerHealth(-10)).toBe(0);
    expect(clampPlayerHealth(48)).toBe(48);
    expect(clampPlayerHealth(PLAYER_MAX_HEALTH + 10)).toBe(PLAYER_MAX_HEALTH);
  });

  it('changes HUD bands at 61, 31, 1, and 0 health', () => {
    expect(healthBandFor(61)).toBe('healthy');
    expect(healthBandFor(60)).toBe('wounded');
    expect(healthBandFor(31)).toBe('wounded');
    expect(healthBandFor(30)).toBe('critical');
    expect(healthBandFor(1)).toBe('critical');
    expect(healthBandFor(0)).toBe('disabled');
  });

  it('shows the critical effect only from one through five while alive', () => {
    expect(isCriticalPlayerHealth(CRITICAL_HEALTH_THRESHOLD + 1, 'alive')).toBe(false);
    expect(isCriticalPlayerHealth(CRITICAL_HEALTH_THRESHOLD, 'alive')).toBe(true);
    expect(isCriticalPlayerHealth(1, 'alive')).toBe(true);
    expect(isCriticalPlayerHealth(0, 'alive')).toBe(false);
    expect(isCriticalPlayerHealth(CRITICAL_HEALTH_THRESHOLD, 'dying')).toBe(false);
    expect(isCriticalPlayerHealth(CRITICAL_HEALTH_THRESHOLD, 'dead')).toBe(false);
  });
});

describe('player death presentation timing', () => {
  it('keeps the camera fall and late fade deterministic', () => {
    expect(deathVisualAt(0)).toEqual({
      progress: 0,
      cameraDrop: 0,
      cameraRoll: 0,
      fadeOpacity: 0,
      complete: false,
    });
    expect(deathVisualAt(DEATH_FADE_START_SECONDS).fadeOpacity).toBe(0);

    const complete = deathVisualAt(DEATH_SEQUENCE_SECONDS);
    expect(complete).toEqual({
      progress: 1,
      cameraDrop: DEATH_CAMERA_DROP,
      cameraRoll: DEATH_CAMERA_ROLL,
      fadeOpacity: 1,
      complete: true,
    });
  });
});
