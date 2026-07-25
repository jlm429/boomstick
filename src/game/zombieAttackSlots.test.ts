import { describe, expect, it } from 'vitest';
import { selectZombieSteering, ZOMBIE_ATTACK_DISTANCE } from './zombie';
import {
  ZOMBIE_ATTACK_SLOT_COUNT,
  ZOMBIE_ATTACK_SLOT_RADIUS,
  ZOMBIE_ATTACK_WAITING_RADIUS,
  ZombieAttackSlotCoordinator,
  hasZombieArrivedAtSlot,
} from './zombieAttackSlots';

const player = { x: 10, z: -4 };

describe('zombie attack slots', () => {
  it('replaces the shared player-center path with nearest distinct ring targets', () => {
    const zombies = [
      { id: 'north', position: { x: 10, z: 4 } },
      { id: 'farther-north', position: { x: 10, z: 6 } },
    ];
    const centerDirections = zombies.map(({ position }) =>
      selectZombieSteering(
        { x: player.x - position.x, z: player.z - position.z },
        Math.hypot(player.x - position.x, player.z - position.z),
        null,
        () => false,
      ),
    );
    expect(centerDirections[0].direction.z).toBe(-1);
    expect(centerDirections[1].direction).toEqual(centerDirections[0].direction);

    const coordinator = new ZombieAttackSlotCoordinator();
    const targets = zombies.map(({ id, position }) => coordinator.claim(id, position, player));

    expect(targets.map(({ index }) => index)).toEqual([0, 1]);
    expect(new Set(targets.map(({ index }) => index))).toHaveProperty('size', 2);
    expect(targets.every(({ kind }) => kind === 'attack')).toBe(true);
  });

  it('preserves valid assignments while the player and zombies move', () => {
    const coordinator = new ZombieAttackSlotCoordinator();
    const first = coordinator.claim('stable', { x: 10, z: 4 }, player);
    const movedPlayer = { x: 12, z: -6 };
    const second = coordinator.claim('stable', { x: 2, z: -6 }, movedPlayer);

    expect(second.index).toBe(first.index);
    expect(second.position.x - first.position.x).toBe(2);
    expect(second.position.z - first.position.z).toBe(-2);
  });

  it('keeps attack ownership exclusive and promotes overflow after release', () => {
    const coordinator = new ZombieAttackSlotCoordinator();
    const targets = Array.from({ length: ZOMBIE_ATTACK_SLOT_COUNT + 1 }, (_, index) =>
      coordinator.claim(`zombie-${index}`, { x: 0, z: 8 + index }, { x: 0, z: 0 }),
    );

    expect(
      new Set(targets.slice(0, ZOMBIE_ATTACK_SLOT_COUNT).map(({ index }) => index)),
    ).toHaveProperty('size', ZOMBIE_ATTACK_SLOT_COUNT);
    expect(targets.at(-1)?.kind).toBe('waiting');
    expect(Math.hypot(targets.at(-1)!.position.x, targets.at(-1)!.position.z)).toBeCloseTo(
      ZOMBIE_ATTACK_WAITING_RADIUS,
    );

    const releasedSlot = coordinator.getAttackSlot('zombie-3');
    coordinator.release('zombie-3');
    const promoted = coordinator.claim('zombie-8', { x: 0, z: 10 }, { x: 0, z: 0 });

    expect(promoted).toMatchObject({ kind: 'attack', index: releasedSlot });
  });

  it('clears all ownership on reset and uses the configured in-range arrival target', () => {
    const coordinator = new ZombieAttackSlotCoordinator();
    const first = coordinator.claim('first', { x: 0, z: 8 }, { x: 0, z: 0 });
    coordinator.claim('second', { x: 8, z: 0 }, { x: 0, z: 0 });

    expect(ZOMBIE_ATTACK_SLOT_RADIUS).toBeLessThan(ZOMBIE_ATTACK_DISTANCE);
    expect(hasZombieArrivedAtSlot(first.position, first.position)).toBe(true);

    coordinator.reset();
    expect(coordinator.getAttackSlot('first')).toBeNull();
    expect(coordinator.getAttackSlot('second')).toBeNull();
    expect(coordinator.claim('replacement', { x: 0, z: 8 }, { x: 0, z: 0 }).index).toBe(
      first.index,
    );
  });
});
