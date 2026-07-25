import { type ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { TRAINING_ZOMBIE_SPAWNS, type TrainingZombieSpawn } from '../game/zombie';
import { ZombieAttackSlotCoordinator } from '../game/zombieAttackSlots';
import { Zombie } from './Zombie';
import { TrainingZombieActors } from './TrainingZombieEncounter';

type ZombieElement = ReactElement<{
  attackSlots: ZombieAttackSlotCoordinator;
  spawn: TrainingZombieSpawn;
}>;

const createEncounterElements = () => {
  const encounter = TrainingZombieActors({
    active: true,
    attackSlots: new ZombieAttackSlotCoordinator(),
    playerAlive: true,
    onPlayerDamage: vi.fn(),
    onZombieRemoved: vi.fn(),
  }) as ReactElement<{ children: ZombieElement[] }>;
  return encounter.props.children;
};

describe('TrainingZombieEncounter', () => {
  it('creates five Zombie instances with stable keys and distinct spawn configurations', () => {
    const zombies = createEncounterElements();

    expect(zombies).toHaveLength(5);
    expect(zombies.every(({ type }) => type === Zombie)).toBe(true);
    expect(zombies.map(({ key }) => key)).toEqual(TRAINING_ZOMBIE_SPAWNS.map(({ id }) => id));
    expect(zombies.map(({ props }) => props.spawn)).toEqual(TRAINING_ZOMBIE_SPAWNS);
    expect(new Set(zombies.map(({ props }) => props.attackSlots))).toHaveProperty('size', 1);
    expect(new Set(zombies.map(({ props }) => props.spawn.position.join(',')))).toHaveProperty(
      'size',
      5,
    );
  });

  it('recreates exactly the same five keyed instances for a fresh run without duplication', () => {
    const firstRun = createEncounterElements();
    const restartedRun = createEncounterElements();

    expect(restartedRun).toHaveLength(5);
    expect(restartedRun.map(({ key }) => key)).toEqual(firstRun.map(({ key }) => key));
    expect(new Set(restartedRun.map(({ key }) => key))).toHaveProperty('size', 5);
  });
});
