import { describe, expect, it } from 'vitest';
import { ARENA_TARGETS } from './targets';

describe('arena targets', () => {
  it('places several stationary targets across different distances', () => {
    expect(ARENA_TARGETS.length).toBeGreaterThanOrEqual(3);
    expect(new Set(ARENA_TARGETS.map(({ id }) => id)).size).toBe(ARENA_TARGETS.length);
    expect(new Set(ARENA_TARGETS.map(({ position }) => position[2])).size).toBeGreaterThan(2);
  });
});
