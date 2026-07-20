import { useFBX } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { CapsuleCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AnimationClip,
  AnimationMixer,
  Group,
  LoopOnce,
  LoopRepeat,
  Mesh,
  Vector3,
  type AnimationAction,
} from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { MAX_FRAME_DELTA } from '../game/constants';
import type { ShotImpactHandler } from '../game/impacts';
import {
  ZOMBIE_MOVE_SPEED,
  ZOMBIE_SPAWN,
  ZOMBIE_STOP_DISTANCE,
  createZombieState,
  hitZombie,
} from '../game/zombie';
import { ZOMBIE_ASSET_URLS } from './zombieAssets';

const ZOMBIE_SOURCE_CLIP_NAME = 'mixamo.com';
const ANIMATION_BONE_PREFIX = 'mixamorig5';
const MODEL_BONE_PREFIX = 'mixamorig';
const MODEL_SCALE = 0.01;
const MODEL_FLOOR_OFFSET = 0.16;
const COLLIDER_HALF_HEIGHT = 0.6;
const COLLIDER_RADIUS = 0.38;
const COLLIDER_CENTER_Y = COLLIDER_HALF_HEIGHT + COLLIDER_RADIUS;
const ANIMATION_BLEND_SECONDS = 0.12;
const chaseDirection = new Vector3();

type ZombieAnimation = 'idle' | 'run' | 'hit' | 'dying';
type ZombieActions = Partial<Record<ZombieAnimation, AnimationAction>>;

function prepareAnimation(
  source: Group,
  name: ZombieAnimation,
  removeHorizontalRootMotion = false,
): AnimationClip {
  const sourceClip = source.animations.find(({ name }) => name === ZOMBIE_SOURCE_CLIP_NAME);
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
  return clip;
}

export function Zombie({ active }: { active: boolean }) {
  const bodyRef = useRef<RapierRigidBody>(null);
  const visualRef = useRef<Group>(null);
  const mixerRef = useRef<AnimationMixer>(null);
  const actionsRef = useRef<ZombieActions>({});
  const currentActionRef = useRef<ZombieAnimation | null>(null);
  const animationRef = useRef<ZombieAnimation>('idle');
  const hitElapsedRef = useRef(0);
  const zombieRef = useRef(createZombieState());
  const [zombie, setZombie] = useState(createZombieState);
  const [animation, setAnimation] = useState<ZombieAnimation>('idle');
  const [hitRevision, setHitRevision] = useState(0);
  const { camera } = useThree();
  const modelAsset = useFBX(ZOMBIE_ASSET_URLS.model);
  const idleAsset = useFBX(ZOMBIE_ASSET_URLS.idle);
  const runAsset = useFBX(ZOMBIE_ASSET_URLS.run);
  const hitAsset = useFBX(ZOMBIE_ASSET_URLS.hit);
  const dyingAsset = useFBX(ZOMBIE_ASSET_URLS.dying);
  const model = useMemo(() => clone(modelAsset) as Group, [modelAsset]);
  const clips = useMemo(
    () => [
      prepareAnimation(idleAsset, 'idle'),
      prepareAnimation(runAsset, 'run', true),
      prepareAnimation(hitAsset, 'hit'),
      prepareAnimation(dyingAsset, 'dying'),
    ],
    [dyingAsset, hitAsset, idleAsset, runAsset],
  );
  const changeAnimation = (next: ZombieAnimation, restart = false) => {
    if (!restart && animationRef.current === next) return;
    animationRef.current = next;
    setAnimation(next);
    if (restart) setHitRevision((revision) => revision + 1);
  };

  useEffect(() => {
    model.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      child.castShadow = true;
      child.receiveShadow = true;
    });
  }, [model]);

  useEffect(() => {
    if (active || !bodyRef.current || zombieRef.current.dead) return;
    const velocity = bodyRef.current.linvel();
    bodyRef.current.setLinvel(
      { x: 0, y: Number.isFinite(velocity.y) ? velocity.y : 0, z: 0 },
      true,
    );
  }, [active]);

  const playAnimation = useCallback((next: ZombieAnimation) => {
    const nextAction = actionsRef.current[next];
    if (!nextAction) return;
    const previousAction = currentActionRef.current
      ? actionsRef.current[currentActionRef.current]
      : undefined;
    if (previousAction && previousAction !== nextAction) {
      previousAction.fadeOut(ANIMATION_BLEND_SECONDS);
    }
    nextAction.reset();
    nextAction.enabled = true;
    nextAction.clampWhenFinished = next === 'hit' || next === 'dying';
    nextAction.setLoop(
      nextAction.clampWhenFinished ? LoopOnce : LoopRepeat,
      nextAction.clampWhenFinished ? 1 : Infinity,
    );
    nextAction.fadeIn(ANIMATION_BLEND_SECONDS).play();
    currentActionRef.current = next;
  }, []);

  useEffect(() => {
    const mixer = new AnimationMixer(model);
    mixerRef.current = mixer;
    actionsRef.current = Object.fromEntries(
      clips.map((clip) => [clip.name, mixer.clipAction(clip)]),
    ) as ZombieActions;
    playAnimation('idle');
    return () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
      if (mixerRef.current === mixer) mixerRef.current = null;
      actionsRef.current = {};
      currentActionRef.current = null;
    };
  }, [clips, model, playAnimation]);

  useEffect(() => playAnimation(animation), [animation, hitRevision, playAnimation]);

  const onShotImpact: ShotImpactHandler = ({ distance }) => {
    const result = hitZombie(zombieRef.current, distance);
    if (!result.reacted) return null;
    zombieRef.current = result.state;
    setZombie(result.state);

    const rigidBody = bodyRef.current;
    if (result.state.dead) {
      if (rigidBody) rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
      changeAnimation('dying');
    } else {
      hitElapsedRef.current = 0;
      changeAnimation('hit', true);
    }
    return 'wall';
  };

  useFrame((_, delta) => {
    if (active && Number.isFinite(delta) && delta > 0 && delta <= MAX_FRAME_DELTA) {
      mixerRef.current?.update(delta);
    }
    const rigidBody = bodyRef.current;
    if (!rigidBody || !active || zombieRef.current.dead) return;
    if (!Number.isFinite(delta) || delta <= 0 || delta > MAX_FRAME_DELTA) {
      const velocity = rigidBody.linvel();
      rigidBody.setLinvel(
        { x: 0, y: Number.isFinite(velocity.y) ? velocity.y : 0, z: 0 },
        true,
      );
      return;
    }

    const velocity = rigidBody.linvel();
    const verticalVelocity = Number.isFinite(velocity.y) ? velocity.y : 0;
    if (animationRef.current === 'hit') {
      hitElapsedRef.current += delta;
      rigidBody.setLinvel({ x: 0, y: verticalVelocity, z: 0 }, true);
      const hitDuration = actionsRef.current.hit?.getClip().duration ?? 0;
      if (hitElapsedRef.current < hitDuration) return;
      hitElapsedRef.current = 0;
    }

    const position = rigidBody.translation();
    chaseDirection.set(camera.position.x - position.x, 0, camera.position.z - position.z);
    const distance = chaseDirection.length();
    if (!Number.isFinite(distance) || distance <= ZOMBIE_STOP_DISTANCE) {
      rigidBody.setLinvel({ x: 0, y: verticalVelocity, z: 0 }, true);
      changeAnimation('idle');
      return;
    }

    chaseDirection.normalize();
    rigidBody.setLinvel(
      {
        x: chaseDirection.x * ZOMBIE_MOVE_SPEED,
        y: verticalVelocity,
        z: chaseDirection.z * ZOMBIE_MOVE_SPEED,
      },
      true,
    );
    if (visualRef.current) {
      visualRef.current.rotation.y = Math.atan2(chaseDirection.x, chaseDirection.z);
    }
    changeAnimation('run');
  });

  return (
    <RigidBody
      ref={bodyRef}
      type={zombie.dead ? 'fixed' : 'dynamic'}
      position={[...ZOMBIE_SPAWN]}
      colliders={false}
      enabledRotations={[false, false, false]}
      canSleep={false}
      ccd
      friction={0.8}
      linearDamping={6}
    >
      {!zombie.dead && (
        <CapsuleCollider
          args={[COLLIDER_HALF_HEIGHT, COLLIDER_RADIUS]}
          position={[0, COLLIDER_CENTER_Y, 0]}
        />
      )}
      <group
        ref={visualRef}
        position={[0, MODEL_FLOOR_OFFSET, 0]}
        scale={MODEL_SCALE}
        userData={{ onShotImpact }}
        dispose={null}
      >
        <primitive object={model} />
      </group>
    </RigidBody>
  );
}
