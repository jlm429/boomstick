import { describe, expect, it } from 'vitest';
import {
  BLOOD_BURST_SECONDS,
  BLOOD_PARTICLE_COUNT,
  bloodBurstOpacity,
  createBloodBurst,
  isBloodBurstComplete,
} from './bloodParticles';

describe('blood particles', () => {
  it('creates a finite outward burst at the actual impact point', () => {
    const values = [0, 0.5, 1];
    let index = 0;
    const burst = createBloodBurst(3, { x: 4, y: 2, z: -1 }, () => {
      const value = values[index % values.length];
      index += 1;
      return value;
    });

    expect(burst.id).toBe(3);
    expect(burst.origin).toEqual({ x: 4, y: 2, z: -1 });
    expect(burst.particles).toHaveLength(BLOOD_PARTICLE_COUNT);
    expect(
      burst.particles.every(({ velocity }) =>
        velocity.every((component) => Number.isFinite(component)),
      ),
    ).toBe(true);
    expect(burst.particles.some(({ velocity }) => Math.hypot(...velocity) > 0)).toBe(true);
  });

  it('fades and expires within the configured short lifetime', () => {
    expect(bloodBurstOpacity(0)).toBe(1);
    expect(bloodBurstOpacity(BLOOD_BURST_SECONDS / 2)).toBe(0.5);
    expect(isBloodBurstComplete(BLOOD_BURST_SECONDS - 0.01)).toBe(false);
    expect(isBloodBurstComplete(BLOOD_BURST_SECONDS)).toBe(true);
    expect(bloodBurstOpacity(BLOOD_BURST_SECONDS)).toBe(0);
  });
});
