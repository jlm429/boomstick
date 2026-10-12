import { describe, expect, it } from 'vitest';
import {
  BLOOD_POOL_CAPACITY,
  ImpactParticlePool,
  PARTICLE_MAX_LIFETIME,
  SURFACE_POOL_CAPACITY,
} from './particlePool';

const origin = { x: 2, y: 1, z: -3 };
const normal = { x: 0, y: 0, z: 1 };
const random = () => 0.5;

describe('bounded impact particles', () => {
  it('bounds repeated bursts and reuses every upload buffer through expiration and restart', () => {
    const pool = new ImpactParticlePool(BLOOD_POOL_CAPACITY);
    const buffers = [pool.positions, pool.colors, pool.opacity, pool.sizes];
    for (let i = 0; i < 100; i++) pool.emit('blood', origin, normal, random);
    expect(pool.activeCount).toBe(BLOOD_POOL_CAPACITY);
    expect(pool.opacity.filter((value) => value > 0)).toHaveLength(BLOOD_POOL_CAPACITY);
    const before = [...pool.positions];
    pool.advance(0.06, true);
    expect([...pool.positions]).not.toEqual(before);
    expect(pool.positions.every(Number.isFinite)).toBe(true);
    for (let i = 0; i < 8; i++) pool.advance(0.06, true);
    expect(pool.activeCount).toBe(0);
    expect(pool.opacity.every((value) => value === 0)).toBe(true);
    pool.emit('blood', origin, normal, random);
    expect(pool.activeCount).toBe(14);
    expect([pool.positions, pool.colors, pool.opacity, pool.sizes]).toEqual(buffers);
    for (let i = 0; i < buffers.length; i++) {
      expect([pool.positions, pool.colors, pool.opacity, pool.sizes][i]).toBe(buffers[i]);
    }
    pool.clear();
    pool.emit('blood', { x: 9, y: 2, z: 1 }, normal, random);
    expect(pool.positions[0]).toBe(9);
    expect(pool.activeCount).toBe(14);
    expect(PARTICLE_MAX_LIFETIME).toBeLessThanOrEqual(0.5);
  });

  it('freezes on pause, rejects invalid frames and clears a suspended tab burst', () => {
    const pool = new ImpactParticlePool(14);
    pool.emit('blood', origin, normal, random);
    const positions = [...pool.positions];
    const opacity = [...pool.opacity];
    pool.advance(2, false);
    for (const delta of [NaN, Infinity, -1, 0]) pool.advance(delta, true);
    expect([...pool.positions]).toEqual(positions);
    expect([...pool.opacity]).toEqual(opacity);
    pool.advance(0.1, true);
    expect(pool.opacity[0]).toBeLessThan(1);
    pool.advance(0.5, true);
    expect(pool.activeCount).toBe(0);
    expect(pool.opacity.every((value) => value === 0)).toBe(true);
  });

  it('expires sparks before dust and bounds light bursts without growing storage', () => {
    const pool = new ImpactParticlePool(SURFACE_POOL_CAPACITY);
    pool.emit('surface', origin, normal, random);
    expect(pool.activeCount).toBe(12);
    for (let i = 0; i < 5; i++) pool.advance(0.05, true);
    expect(pool.activeCount).toBe(8);
    for (let i = 0; i < 4; i++) pool.advance(0.05, true);
    expect(pool.activeCount).toBe(0);
    for (let i = 0; i < 100; i++) pool.emit('light', origin, normal, random);
    expect(pool.activeCount).toBe(SURFACE_POOL_CAPACITY);
    pool.clear();
    pool.emit('light', origin, normal, random);
    expect(pool.activeCount).toBe(18);
  });

  it('rejects invalid capacity and non-finite impact positions', () => {
    for (const capacity of [0, -1, 1.5, Infinity])
      expect(() => new ImpactParticlePool(capacity)).toThrow();
    const pool = new ImpactParticlePool(14);
    pool.emit('blood', { ...origin, x: NaN }, normal, random);
    expect(pool.activeCount).toBe(0);
  });
});
