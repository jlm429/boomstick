import { TRAINING_ZOMBIE_SPAWNS, type TrainingZombieId } from '../game/zombie';
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
  return (
    <>
      {TRAINING_ZOMBIE_SPAWNS.map((spawn) => (
        <Zombie
          key={spawn.id}
          active={active}
          playerAlive={playerAlive}
          spawn={spawn}
          onPlayerDamage={onPlayerDamage}
          onRemoved={() => onZombieRemoved(spawn.id)}
        />
      ))}
    </>
  );
}
