import { describe, expect, it } from 'vitest';
import {
  ARENA_BLOCKS,
  ARENA_LIGHT_FIXTURES,
  ARENA_RENDER_CONFIG,
  isArenaSpawnValid,
  shouldResetPlayerPosition,
} from './arena';
import { PLAYER_SPAWN } from './constants';

describe('arena configuration', () => {
  it('keeps the configured spawn finite, clear, and facing the landmark', () => {
    expect(isArenaSpawnValid(PLAYER_SPAWN)).toBe(true);
    expect(ARENA_RENDER_CONFIG.landmark[2]).toBeLessThan(PLAYER_SPAWN[2]);
    expect(isArenaSpawnValid([Number.NaN, 1, 0])).toBe(false);
    expect(isArenaSpawnValid([-9, 2, -3])).toBe(false);
  });

  it('provides matching procedural boundaries, floor, obstacles, and visible rendering', () => {
    expect(ARENA_RENDER_CONFIG.background).not.toMatch(/^#0{3,6}$/i);
    expect(ARENA_RENDER_CONFIG.fog).toBe(true);
    expect(ARENA_RENDER_CONFIG.postprocessing).toBe(false);
    expect(ARENA_BLOCKS.some(({ id }) => id === 'floor')).toBe(true);
    expect(ARENA_BLOCKS.filter(({ id }) => id.endsWith('wall'))).toHaveLength(4);
    expect(
      ARENA_BLOCKS.filter(({ id }) => id.includes('pillar')).length,
    ).toBeGreaterThanOrEqual(2);
  });

  it('mounts repeated lights consistently on walls and obstacle tops', () => {
    const wallLights = ARENA_LIGHT_FIXTURES.filter(({ kind }) => kind === 'wall');
    expect(wallLights).toHaveLength(8);
    expect(new Set(wallLights.map(({ position }) => position[1]))).toEqual(new Set([3.1]));
    expect(
      wallLights.every(({ position: [x, , z] }) =>
        [Math.abs(x), Math.abs(z)].some((coordinate) => coordinate === 23.42),
      ),
    ).toBe(true);

    for (const kind of ['pillar', 'cover'] as const) {
      const blocks = ARENA_BLOCKS.filter(({ id }) => id.includes(kind));
      const lights = ARENA_LIGHT_FIXTURES.filter((fixture) => fixture.kind === kind);
      expect(lights).toHaveLength(blocks.length);
      expect(lights.map(({ position }) => position[1])).toEqual(
        blocks.map(({ position, halfExtents }) => position[1] + halfExtents[1]),
      );
    }

    expect(ARENA_LIGHT_FIXTURES.filter(({ contributesLight }) => contributesLight)).toHaveLength(
      6,
    );
  });

  it('resets invalid or escaped player transforms', () => {
    expect(shouldResetPlayerPosition(0, 1, 0)).toBe(false);
    expect(shouldResetPlayerPosition(0, Number.NaN, 0)).toBe(true);
    expect(shouldResetPlayerPosition(0, -9, 0)).toBe(true);
    expect(shouldResetPlayerPosition(40, 1, 0)).toBe(true);
  });
});
