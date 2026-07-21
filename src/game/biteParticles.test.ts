import { describe, expect, it } from 'vitest';
import {
  BLOOD_BURST_SECONDS,
  BLOOD_PARTICLE_COUNT,
  BLOOD_PARTICLE_SIZE,
} from './bloodParticles';
import {
  BITE_BURST_SECONDS,
  BITE_PARTICLE_COUNT,
  BITE_PARTICLE_SIZE,
  ZOMBIE_BITE_IMPACT_FRACTION,
  biteBurstOpacity,
  createBiteBurst,
  didAttackReachBiteImpact,
  isBiteBurstComplete,
} from './biteParticles';

describe('bite particles', () => {
  it('creates one finite burst that is smaller than shotgun hit blood', () => {
    const values = [0, 0.5, 1];
    let index = 0;
    const burst = createBiteBurst(4, { x: 1, y: 2, z: 3 }, () => {
      const value = values[index % values.length];
      index += 1;
      return value;
    });

    expect(burst).toMatchObject({ id: 4, origin: { x: 1, y: 2, z: 3 } });
    expect(burst.particles).toHaveLength(BITE_PARTICLE_COUNT);
    expect(BITE_PARTICLE_COUNT).toBeLessThan(BLOOD_PARTICLE_COUNT);
    expect(BITE_PARTICLE_SIZE).toBeLessThan(BLOOD_PARTICLE_SIZE);
    expect(BITE_BURST_SECONDS).toBeLessThan(BLOOD_BURST_SECONDS);
    expect(
      burst.particles.every(({ velocity }) =>
        velocity.every((component) => Number.isFinite(component)),
      ),
    ).toBe(true);
  });

  it('reports exactly one impact crossing during each attack cycle', () => {
    const duration = 4;
    const impactTime = duration * ZOMBIE_BITE_IMPACT_FRACTION;

    expect(didAttackReachBiteImpact(0, impactTime - 0.01, duration)).toBe(false);
    expect(didAttackReachBiteImpact(impactTime - 0.01, impactTime, duration)).toBe(true);
    expect(didAttackReachBiteImpact(impactTime, impactTime + 0.01, duration)).toBe(false);
    expect(didAttackReachBiteImpact(duration - 0.01, 0.01, duration)).toBe(false);
    expect(didAttackReachBiteImpact(0.01, impactTime, duration)).toBe(true);
  });

  it('fades and cleans up after its brief configured lifetime', () => {
    expect(biteBurstOpacity(0)).toBe(1);
    expect(biteBurstOpacity(BITE_BURST_SECONDS / 2)).toBe(0.5);
    expect(isBiteBurstComplete(BITE_BURST_SECONDS - 0.01)).toBe(false);
    expect(isBiteBurstComplete(BITE_BURST_SECONDS)).toBe(true);
    expect(biteBurstOpacity(BITE_BURST_SECONDS)).toBe(0);
  });
});
