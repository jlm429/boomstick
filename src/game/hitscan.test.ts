import { describe, expect, it } from 'vitest';
import { resolveNearestTargetHit, resolvePelletHit } from './hitscan';

describe('pellet hit resolution', () => {
  it('returns the nearest target when no arena block is closer', () => {
    expect(resolvePelletHit([0, 2, 0], [0, 0, -1])).toBe('target-far');
  });

  it('lets a nearer arena block prevent a target hit', () => {
    expect(
      resolveNearestTargetHit(
        [0, 0, 0],
        [0, 0, -1],
        [{ id: 'target', position: [0, 0, -8], halfExtents: [1, 1, 1] }],
        [{ id: 'cover', position: [0, 0, -4], halfExtents: [1, 1, 1] }],
      ),
    ).toBeNull();
  });

  it('lets a nearer target block a farther target', () => {
    expect(
      resolveNearestTargetHit(
        [0, 0, 0],
        [0, 0, -1],
        [
          { id: 'near', position: [0, 0, -4], halfExtents: [1, 1, 1] },
          { id: 'far', position: [0, 0, -8], halfExtents: [1, 1, 1] },
        ],
        [],
      ),
    ).toBe('near');
  });
});
