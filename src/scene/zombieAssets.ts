import { useFBX } from '@react-three/drei';
import {
  AnimationClip,
  Group,
  Mesh,
  SkinnedMesh,
  Sphere,
  Vector3,
  type Raycaster,
} from 'three';
import { mergeGroups } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { prepareZombieMaterials, disposeZombieMaterials } from './zombieMaterials';
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
const preparedAnimationClips = new WeakMap<Group, readonly AnimationClip[]>();
const shotRaycastGenerations = new WeakMap<Raycaster, number>();
let nextShotRaycastGeneration = 1;
const ZOMBIE_RAYCAST_BOUNDS_PADDING = 1.5;

const ZOMBIE_SOURCE_CLIP_NAME = 'mixamo.com';
const ANIMATION_BONE_PREFIX = 'mixamorig5';
const MODEL_BONE_PREFIX = 'mixamorig';

export type ZombieAnimationAssetSet = Readonly<{
  idle: Group;
  run: Group;
  attack: Group;
  hit: Group;
  dying: Group;
}>;

function prepareAnimation(
  source: Group,
  name: string,
  modelNodeNames: ReadonlySet<string>,
  removeHorizontalRootMotion = false,
) {
  const sourceClip = source.animations.find(
    ({ name: clipName }) => clipName === ZOMBIE_SOURCE_CLIP_NAME,
  );
  if (!sourceClip) {
    throw new Error(`Zombie animation is missing the ${ZOMBIE_SOURCE_CLIP_NAME} clip.`);
  }

  const clip = sourceClip.clone();
  clip.name = name;
  for (const track of clip.tracks) {
    track.name = track.name.replace(ANIMATION_BONE_PREFIX, MODEL_BONE_PREFIX);
    if (!removeHorizontalRootMotion || track.name !== `${MODEL_BONE_PREFIX}Hips.position`)
      continue;
    const initialX = track.values[0];
    const initialZ = track.values[2];
    for (let index = 0; index < track.values.length; index += 3) {
      track.values[index] = initialX;
      track.values[index + 2] = initialZ;
    }
  }
  clip.tracks = clip.tracks.filter((track) => {
    const propertySeparator = track.name.indexOf('.');
    return propertySeparator > 0 && modelNodeNames.has(track.name.slice(0, propertySeparator));
  });
  return clip;
}

export function prepareZombieAnimationClips(
  modelSource: Group,
  animationAssets: ZombieAnimationAssetSet,
) {
  const cached = preparedAnimationClips.get(modelSource);
  if (cached) return cached;

  const modelNodeNames = new Set<string>();
  modelSource.traverse(({ name }) => modelNodeNames.add(name));
  const clips = [
    prepareAnimation(animationAssets.idle, 'idle', modelNodeNames),
    prepareAnimation(animationAssets.run, 'run', modelNodeNames, true),
    prepareAnimation(animationAssets.attack, 'attack', modelNodeNames, true),
    prepareAnimation(animationAssets.hit, 'hit', modelNodeNames),
    prepareAnimation(animationAssets.dying, 'dying', modelNodeNames),
  ] as const;
  preparedAnimationClips.set(modelSource, clips);
  return clips;
}

export function installCachedShotRaycast(mesh: SkinnedMesh) {
  const position = mesh.geometry.getAttribute('position');
  if (!position) return;

  const cachedPositions = new Float32Array(position.count * 3);
  const skinnedPosition = new Vector3();
  const worldBounds = new Sphere();
  const originalGetVertexPosition = mesh.getVertexPosition;
  const originalRaycast = mesh.raycast;
  let cachedGeneration = -1;

  mesh.raycast = (raycaster, intersections) => {
    const generation = shotRaycastGenerations.get(raycaster);
    if (generation === undefined) {
      originalRaycast.call(mesh, raycaster, intersections);
      return;
    }

    if (mesh.boundingSphere) {
      worldBounds.copy(mesh.boundingSphere).applyMatrix4(mesh.matrixWorld);
      if (!raycaster.ray.intersectsSphere(worldBounds)) return;
    }

    if (cachedGeneration !== generation) {
      cachedGeneration = generation;
      for (let index = 0; index < position.count; index += 1) {
        originalGetVertexPosition.call(mesh, index, skinnedPosition);
        skinnedPosition.toArray(cachedPositions, index * 3);
      }
    }

    mesh.getVertexPosition = (index, target) => target.fromArray(cachedPositions, index * 3);
    try {
      originalRaycast.call(mesh, raycaster, intersections);
    } finally {
      mesh.getVertexPosition = originalGetVertexPosition;
    }
  };
}

export function beginZombieRaycastShot(raycaster: Raycaster) {
  shotRaycastGenerations.set(raycaster, nextShotRaycastGeneration);
  nextShotRaycastGeneration += 1;
}

function optimizedZombieModelAsset(source: Group) {
  const cached = optimizedModelAssets.get(source);
  if (cached) return cached;

  const optimized = clone(source) as Group;
  optimized.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    child.geometry = child.geometry.clone();
    if (child.geometry.groups.length > 1) mergeGroups(child.geometry);
    if (child instanceof SkinnedMesh) {
      child.computeBoundingSphere();
      if (child.boundingSphere) child.boundingSphere.radius *= ZOMBIE_RAYCAST_BOUNDS_PADDING;
    }
  });
  optimizedModelAssets.set(source, optimized);
  return optimized;
}

export function createZombieModelInstance(source: Group) {
  const model = clone(optimizedZombieModelAsset(source)) as Group;
  prepareZombieMaterials(model);
  model.traverse((child) => {
    if (child instanceof SkinnedMesh) installCachedShotRaycast(child);
  });
  return model;
}

export function disposeZombieModelInstance(model: Group) {
  disposeZombieMaterials(model);
  const disposedSkeletons = new Set<SkinnedMesh['skeleton']>();
  model.traverse((child) => {
    if (!(child instanceof SkinnedMesh) || disposedSkeletons.has(child.skeleton)) return;
    disposedSkeletons.add(child.skeleton);
    child.skeleton.dispose();
  });
}

export function warmZombieModelAsset(source: Group) {
  optimizedZombieModelAsset(source);
}

export function preloadZombieAssets() {
  for (const url of Object.values(ZOMBIE_ASSET_URLS)) useFBX.preload(url);
}
