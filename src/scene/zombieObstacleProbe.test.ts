import rapier from '@dimforge/rapier3d-compat';
import { expect, it } from 'vitest';
import { ZOMBIE_COLLIDER_RADIUS } from '../game/zombie';
import { createZombieObstacleProbe } from './zombieObstacleProbe';

it('blocks inward movement at cover contact and leaves tangent movement and retreat open', async () => {
  await rapier.init();
  const world = new rapier.World({ x: 0, y: 0, z: 0 });
  try {
    world.createCollider(rapier.ColliderDesc.cuboid(0.5, 1, 2).setTranslation(-0.5, 1, 0));
    world.step();
    const probe = createZombieObstacleProbe(rapier, world);
    probe.setOrigin(ZOMBIE_COLLIDER_RADIUS, 1, 0);

    expect(probe.isBlocked({ x: -1, z: 0 }, 0.04)).toBe(true);
    expect(probe.isBlocked({ x: 0, z: 1 }, 2)).toBe(false);
    expect(probe.isBlocked({ x: 1, z: 0 }, 2)).toBe(false);
    expect(probe.hasClearBitePath({ x: -0.74, z: 0 }, 0.74)).toBe(false);
    expect(probe.hasClearBitePath({ x: 0.74, z: 0 }, 0.74)).toBe(true);
  } finally {
    world.free();
  }
});
