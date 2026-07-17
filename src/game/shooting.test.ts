import { describe, expect, it } from 'vitest';
import {
  SHOT_COOLDOWN_SECONDS,
  SHOT_PELLET_COUNT,
  canFireShot,
  pelletOffsets,
} from './shooting';

describe('shotgun firing rules', () => {
  it('enforces a short cooldown between shots', () => {
    expect(canFireShot(-Infinity, 0)).toBe(true);
    expect(canFireShot(1, 1 + SHOT_COOLDOWN_SECONDS - 0.001)).toBe(false);
    expect(canFireShot(1, 1 + SHOT_COOLDOWN_SECONDS)).toBe(true);
  });

  it('uses a centered, deterministic multi-pellet spread', () => {
    const offsets = pelletOffsets();
    expect(offsets).toHaveLength(SHOT_PELLET_COUNT);
    expect(offsets[0]).toEqual([0, 0]);
    expect(offsets.some(([horizontal, vertical]) => horizontal !== 0 || vertical !== 0)).toBe(
      true,
    );
  });
});
