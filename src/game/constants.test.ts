import { describe, expect, it } from 'vitest';
import {
  APP_VERSION,
  ARENA_HALF_EXTENT,
  MAX_FRAME_DELTA,
  MOVE_SPEED,
  PLAYER_SPAWN,
  isValidSpawn,
} from './constants';

describe('game configuration', () => {
  it('exposes a valid version, spawn point, and movement speed', () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(PLAYER_SPAWN).toHaveLength(3);
    expect(MOVE_SPEED).toBeGreaterThan(0);
    expect(MAX_FRAME_DELTA).toBeGreaterThan(0);
    expect(MAX_FRAME_DELTA).toBeLessThanOrEqual(0.1);
    expect(isValidSpawn(PLAYER_SPAWN)).toBe(true);
    expect(isValidSpawn([ARENA_HALF_EXTENT, 1, 0])).toBe(false);
  });
});
