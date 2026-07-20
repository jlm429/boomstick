import { useFBX } from '@react-three/drei';
import zombieModelUrl from '../assets/models/zombies/Zombie.fbx?url';
import zombieDyingUrl from '../assets/models/zombies/Zombie_Dying.fbx?url';
import zombieIdleUrl from '../assets/models/zombies/Zombie_Idle.fbx?url';
import zombieHitUrl from '../assets/models/zombies/Zombie_Reaction_Hit.fbx?url';
import zombieRunUrl from '../assets/models/zombies/Zombie_Run.fbx?url';

export const ZOMBIE_ASSET_URLS = {
  model: zombieModelUrl,
  idle: zombieIdleUrl,
  run: zombieRunUrl,
  hit: zombieHitUrl,
  dying: zombieDyingUrl,
} as const;

export function preloadZombieAssets() {
  for (const url of Object.values(ZOMBIE_ASSET_URLS)) useFBX.preload(url);
}
