import { describe, expect, it } from 'vitest';
import {
  ARENA_TARGETS,
  BASE_SHOTGUN_DAMAGE,
  MAX_DAMAGE_FALLOFF_DISTANCE,
  MIN_ACCURACY_DAMAGE_MULTIPLIER,
  MIN_DISTANCE_DAMAGE_MULTIPLIER,
  TARGET_HIT_RADIUS,
  TARGET_MAX_HEALTH,
  clampTargetHealth,
  hitTarget,
  targetDamageAt,
} from './targets';

const centerHit = { x: 0, y: 0 };
const edgeHit = { x: TARGET_HIT_RADIUS, y: 0 };
const minimumDamage =
  BASE_SHOTGUN_DAMAGE * MIN_DISTANCE_DAMAGE_MULTIPLIER * MIN_ACCURACY_DAMAGE_MULTIPLIER;

describe('arena targets', () => {
  it('places several stationary targets across different distances', () => {
    expect(ARENA_TARGETS.length).toBeGreaterThanOrEqual(3);
    expect(new Set(ARENA_TARGETS.map(({ id }) => id)).size).toBe(ARENA_TARGETS.length);
    expect(new Set(ARENA_TARGETS.map(({ position }) => position[2])).size).toBeGreaterThan(2);
    expect(
      ARENA_TARGETS.every(({ maximumHealth }) => maximumHealth === TARGET_MAX_HEALTH),
    ).toBe(true);
  });

  it('deals approximately maximum damage for a close center hit', () => {
    expect(targetDamageAt(0, centerHit)).toBeCloseTo(BASE_SHOTGUN_DAMAGE);
  });

  it('deals approximately minimum damage for a distant edge hit', () => {
    expect(targetDamageAt(MAX_DAMAGE_FALLOFF_DISTANCE, edgeHit)).toBeCloseTo(minimumDamage);
  });

  it('rewards center accuracy at the same distance', () => {
    expect(targetDamageAt(12, centerHit)).toBeGreaterThan(targetDamageAt(12, edgeHit));
  });

  it('rewards close range at the same hit position', () => {
    expect(targetDamageAt(4, centerHit)).toBeGreaterThan(targetDamageAt(24, centerHit));
  });

  it('keeps damage within the configured minimum and maximum', () => {
    const samples = [
      targetDamageAt(-5, centerHit),
      targetDamageAt(8, { x: TARGET_HIT_RADIUS / 2, y: 0 }),
      targetDamageAt(MAX_DAMAGE_FALLOFF_DISTANCE * 2, {
        x: TARGET_HIT_RADIUS * 2,
        y: 0,
      }),
      targetDamageAt(Number.POSITIVE_INFINITY, { x: Number.POSITIVE_INFINITY, y: 0 }),
    ];

    for (const damage of samples) {
      expect(damage).toBeGreaterThanOrEqual(minimumDamage);
      expect(damage).toBeLessThanOrEqual(BASE_SHOTGUN_DAMAGE);
    }
  });

  it('never reduces health below zero', () => {
    expect(clampTargetHealth(-10)).toBe(0);
    expect(hitTarget(1, 0, centerHit).health).toBe(0);
  });

  it('ignores hits after a target is depleted', () => {
    const depleted = hitTarget(1, 0, centerHit);
    const laterHit = hitTarget(depleted.health, 0, centerHit);

    expect(depleted).toMatchObject({ health: 0, reacted: true });
    expect(laterHit).toEqual({ health: 0, damage: 0, reacted: false });
  });
});
