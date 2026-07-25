import { useEffect, useState } from 'react';
import { TRAINING_ZOMBIE_SPAWNS, type TrainingZombieId } from '../game/zombie';
import { ZombieAttackSlotCoordinator } from '../game/zombieAttackSlots';
import { Zombie } from './Zombie';

export function TrainingZombieEncounter({
  active,
  playerAlive,
  onPlayerDamage,
  onZombieRemoved,
}: {
  active: boolean;
  playerAlive: boolean;
  onPlayerDamage: (damage: number) => void;
  onZombieRemoved: (zombieId: TrainingZombieId) => void;
}) {
  const [attackSlots] = useState(() => new ZombieAttackSlotCoordinator());
  useEffect(() => () => attackSlots.reset(), [attackSlots]);

  return (
    <TrainingZombieActors
      active={active}
      attackSlots={attackSlots}
      playerAlive={playerAlive}
      onPlayerDamage={onPlayerDamage}
      onZombieRemoved={onZombieRemoved}
    />
  );
}

export function TrainingZombieActors({
  active,
  attackSlots,
  playerAlive,
  onPlayerDamage,
  onZombieRemoved,
}: {
  active: boolean;
  attackSlots: ZombieAttackSlotCoordinator;
  playerAlive: boolean;
  onPlayerDamage: (damage: number) => void;
  onZombieRemoved: (zombieId: TrainingZombieId) => void;
}) {
  return (
    <>
      {TRAINING_ZOMBIE_SPAWNS.map((spawn) => (
        <Zombie
          key={spawn.id}
          active={active}
          attackSlots={attackSlots}
          playerAlive={playerAlive}
          spawn={spawn}
          onPlayerDamage={onPlayerDamage}
          onRemoved={() => onZombieRemoved(spawn.id)}
        />
      ))}
    </>
  );
}
