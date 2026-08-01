import { useFBX } from '@react-three/drei';
import { Group, Mesh } from 'three';
import { mergeGroups } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import zombieModelUrl from '../assets/models/zombies/Zombie.fbx?url';
import zombieAttackUrl from '../assets/models/zombies/Zombie_Attack.fbx?url';
import zombieDyingUrl from '../assets/models/zombies/Zombie_Dying.fbx?url';
import zombieIdleUrl from '../assets/models/zombies/Zombie_Idle.fbx?url';
import zombieHitUrl from '../assets/models/zombies/Zombie_Reaction_Hit.fbx?url';
import zombieRunUrl from '../assets/models/zombies/Zombie_Run.fbx?url';

export const ZOMBIE_ASSET_URLS = {
  model: zombieModelUrl,
  idle: zombieIdleUrl,
  run: zombieRunUrl,
  attack: zombieAttackUrl,
  hit: zombieHitUrl,
  dying: zombieDyingUrl,
} as const;

const optimizedModelAssets = new WeakMap<Group, Group>();

function optimizedZombieModelAsset(source: Group) {
  const cached = optimizedModelAssets.get(source);
  if (cached) return cached;

  const optimized = clone(source) as Group;
  optimized.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    child.geometry = child.geometry.clone();
    if (child.geometry.groups.length > 1) mergeGroups(child.geometry);
  });
  optimizedModelAssets.set(source, optimized);
  return optimized;
}

export function createZombieModelInstance(source: Group) {
  return clone(optimizedZombieModelAsset(source)) as Group;
}

export function preloadZombieAssets() {
  for (const url of Object.values(ZOMBIE_ASSET_URLS)) useFBX.preload(url);
}
