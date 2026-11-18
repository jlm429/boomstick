import rapier from '@dimforge/rapier3d-compat';
import { expect, it } from 'vitest';
import { ZOMBIE_ATTACK_DISTANCE, ZOMBIE_COLLIDER_RADIUS } from '../game/zombie';
import { ZombieAttackSlotCoordinator } from '../game/zombieAttackSlots';
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

it('lets an adjacent zombie reach bite range beside a zombie already biting', async () => {
  await rapier.init();
  const world = new rapier.World({ x: 0, y: 0, z: 0 });
  try {
    const slots = new ZombieAttackSlotCoordinator();
    const player = { x: 0, z: 0 };
    const first = slots.claim('first', { x: 0, z: 2 }, player);
    const neighbor = slots.claim('neighbor', { x: 2, z: 2 }, player);
    expect(neighbor.index).toBe(first.index + 1);

    world.createCollider(
      rapier.ColliderDesc.capsule(0.6, ZOMBIE_COLLIDER_RADIUS).setTranslation(
        first.position.x,
        1,
        ZOMBIE_ATTACK_DISTANCE,
      ),
    );
    world.step();

    const { x, z } = neighbor.position;
    expect(Math.hypot(x, z)).toBeLessThan(ZOMBIE_ATTACK_DISTANCE);
    expect(
      world.castShape(
        { x: 3 * x, y: 1, z: 3 * z },
        { x: 0, y: 0, z: 0, w: 1 },
        { x: -2 * x, y: 0, z: -2 * z },
        new rapier.Capsule(0.6, ZOMBIE_COLLIDER_RADIUS),
        0,
        1,
        true,
      ),
    ).toBeNull();
  } finally {
    world.free();
  }
});
