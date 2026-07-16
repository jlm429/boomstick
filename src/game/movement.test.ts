import { describe, expect, it } from 'vitest';
import { movementVector } from './movement';

describe('movementVector', () => {
  it('returns no movement without input', () => {
    expect(
      movementVector({ forward: false, backward: false, left: false, right: false }),
    ).toEqual([0, 0]);
  });

  it('normalizes diagonal movement to preserve movement speed', () => {
    const [x, z] = movementVector({ forward: true, backward: false, left: false, right: true });
    expect(Math.hypot(x, z)).toBeCloseTo(1);
    expect(x).toBeGreaterThan(0);
    expect(z).toBeLessThan(0);
  });
});
