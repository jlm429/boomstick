import { describe, expect, it } from 'vitest';
import { APP_VERSION, MOVE_SPEED, PLAYER_SPAWN } from './constants';

describe('game configuration', () => {
  it('exposes a valid version, spawn point, and movement speed', () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(PLAYER_SPAWN).toHaveLength(3);
    expect(MOVE_SPEED).toBeGreaterThan(0);
  });
});
