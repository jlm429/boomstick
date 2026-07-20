import { useFBX } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import {
  CapsuleCollider,
  RigidBody,
  useRapier,
  type RapierRigidBody,
} from '@react-three/rapier';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AnimationClip,
  AnimationMixer,
  BufferAttribute,
  Group,
  LoopOnce,
  LoopRepeat,
  Mesh,
  PointsMaterial,
  type AnimationAction,
} from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import {
  bloodBurstOpacity,
  createBloodBurst,
  isBloodBurstComplete,
  type BloodBurst,
} from '../game/bloodParticles';
import { MAX_FRAME_DELTA } from '../game/constants';
import type { ShotImpactHandler } from '../game/impacts';
import {
  ZOMBIE_MOVE_SPEED,
  ZOMBIE_SPAWN,
  advanceZombieBehavior,
  createZombieBehaviorState,
  createZombieState,
  hitZombie,
  interruptZombieBehavior,
  isZombieCorpseExpired,
  selectZombieSteering,
  type PlanarDirection,
  type ZombieBehaviorMode,
  type ZombieBehaviorState,
  type ZombieSteeringSide,
} from '../game/zombie';
import { ZombieAttackAudio } from './zombieAudio';
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
const TURN_SPEED_RADIANS = 7;
const STEERING_CLEARANCE = COLLIDER_RADIUS + 0.12;
const RAY_HIT_TOLERANCE = 0.04;
const STEERING_RAY_OFFSETS = [-STEERING_CLEARANCE, 0, STEERING_CLEARANCE] as const;

type ZombieAnimation = 'idle' | 'run' | 'attack' | 'hit' | 'dying';
type ZombieActions = Partial<Record<ZombieAnimation, AnimationAction>>;

const animationForMode = (mode: ZombieBehaviorMode): ZombieAnimation => {
  if (mode === 'chase') return 'run';
  if (mode === 'dead') return 'dying';
  return mode;
};

const normalizedAngleDelta = (from: number, to: number) =>
  Math.atan2(Math.sin(to - from), Math.cos(to - from));

function prepareAnimation(
  source: Group,
  name: ZombieAnimation,
  modelNodeNames: ReadonlySet<string>,
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
  clip.tracks = clip.tracks.filter((track) => {
    const propertySeparator = track.name.indexOf('.');
    return propertySeparator > 0 && modelNodeNames.has(track.name.slice(0, propertySeparator));
  });
  return clip;
}

function BloodBurstEffect({
  burst,
  onComplete,
}: {
  burst: BloodBurst;
  onComplete: () => void;
}) {
  const elapsedRef = useRef(0);
  const completedRef = useRef(false);
  const positionAttributeRef = useRef<BufferAttribute>(null);
  const materialRef = useRef<PointsMaterial>(null);
  const positions = useMemo(() => new Float32Array(burst.particles.length * 3), [burst]);

  useFrame((_, delta) => {
    if (completedRef.current || !Number.isFinite(delta) || delta <= 0) return;
    elapsedRef.current += delta;
    if (isBloodBurstComplete(elapsedRef.current)) {
      completedRef.current = true;
      onComplete();
      return;
    }

    const elapsed = elapsedRef.current;
    const drag = Math.exp(-elapsed * 2.4);
    burst.particles.forEach(({ velocity }, index) => {
      const positionIndex = index * 3;
      positions[positionIndex] = velocity[0] * elapsed * drag;
      positions[positionIndex + 1] = velocity[1] * elapsed * drag - 1.8 * elapsed * elapsed;
      positions[positionIndex + 2] = velocity[2] * elapsed * drag;
    });
    if (positionAttributeRef.current) positionAttributeRef.current.needsUpdate = true;
    if (materialRef.current) materialRef.current.opacity = bloodBurstOpacity(elapsed);
  });

  return (
    <points position={[burst.origin.x, burst.origin.y, burst.origin.z]} raycast={() => null}>
      <bufferGeometry>
        <bufferAttribute
          ref={positionAttributeRef}
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        color="#d51f1f"
        opacity={1}
        size={0.11}
        sizeAttenuation
        transparent
        depthWrite={false}
      />
    </points>
  );
}

function ZombieActor({ active, onRemoved }: { active: boolean; onRemoved: () => void }) {
  const bodyRef = useRef<RapierRigidBody>(null);
  const visualRef = useRef<Group>(null);
  const mixerRef = useRef<AnimationMixer>(null);
  const actionsRef = useRef<ZombieActions>({});
  const currentActionRef = useRef<ZombieAnimation | null>(null);
  const animationRef = useRef<ZombieAnimation>('idle');
  const behaviorRef = useRef<ZombieBehaviorState>(createZombieBehaviorState());
  const steeringSideRef = useRef<ZombieSteeringSide>(null);
  const nextBurstIdRef = useRef(1);
  const zombieRef = useRef(createZombieState());
  const [zombie, setZombie] = useState(createZombieState);
  const [animation, setAnimation] = useState<ZombieAnimation>('idle');
  const [animationRevision, setAnimationRevision] = useState(0);
  const [bloodBursts, setBloodBursts] = useState<readonly BloodBurst[]>([]);
  const [zombieAudio] = useState(() => new ZombieAttackAudio());
  const { camera } = useThree();
  const { rapier, world } = useRapier();
  const obstacleRay = useMemo(
    () => new rapier.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }),
    [rapier],
  );
  const modelAsset = useFBX(ZOMBIE_ASSET_URLS.model);
  const idleAsset = useFBX(ZOMBIE_ASSET_URLS.idle);
  const runAsset = useFBX(ZOMBIE_ASSET_URLS.run);
  const attackAsset = useFBX(ZOMBIE_ASSET_URLS.attack);
  const hitAsset = useFBX(ZOMBIE_ASSET_URLS.hit);
  const dyingAsset = useFBX(ZOMBIE_ASSET_URLS.dying);
  const model = useMemo(() => clone(modelAsset) as Group, [modelAsset]);
  const modelNodeNames = useMemo(() => {
    const names = new Set<string>();
    model.traverse(({ name }) => names.add(name));
    return names;
  }, [model]);
  const clips = useMemo(
    () => [
      prepareAnimation(idleAsset, 'idle', modelNodeNames),
      prepareAnimation(runAsset, 'run', modelNodeNames, true),
      prepareAnimation(attackAsset, 'attack', modelNodeNames, true),
      prepareAnimation(hitAsset, 'hit', modelNodeNames),
      prepareAnimation(dyingAsset, 'dying', modelNodeNames),
    ],
    [attackAsset, dyingAsset, hitAsset, idleAsset, modelNodeNames, runAsset],
  );

  const changeAnimation = (next: ZombieAnimation, restart = false) => {
    if (!restart && animationRef.current === next) return;
    animationRef.current = next;
    setAnimation(next);
    if (restart) setAnimationRevision((revision) => revision + 1);
  };

  const applyBehavior = (next: ZombieBehaviorState, restartAnimation = false) => {
    const previousMode = behaviorRef.current.mode;
    behaviorRef.current = next;
    if (previousMode === next.mode && !restartAnimation) return;
    if (previousMode === 'attack' && next.mode !== 'attack') zombieAudio.leaveAttack();
    if (next.mode === 'attack' && previousMode !== 'attack') zombieAudio.enterAttack();
    if (next.mode === 'dead') zombieAudio.stop();
    changeAnimation(animationForMode(next.mode), restartAnimation);
  };

  useEffect(() => {
    model.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      child.castShadow = true;
      child.receiveShadow = true;
    });
  }, [model]);

  useEffect(() => {
    if (active) {
      if (behaviorRef.current.mode === 'attack') zombieAudio.enterAttack();
      return;
    }
    zombieAudio.leaveAttack();
    if (!bodyRef.current || zombieRef.current.dead) return;
    const velocity = bodyRef.current.linvel();
    bodyRef.current.setLinvel(
      { x: 0, y: Number.isFinite(velocity.y) ? velocity.y : 0, z: 0 },
      true,
    );
  }, [active, zombieAudio]);

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

  useEffect(() => playAnimation(animation), [animation, animationRevision, playAnimation]);
  useEffect(() => () => zombieAudio.stop(), [zombieAudio]);

  const removeBloodBurst = useCallback((id: number) => {
    setBloodBursts((bursts) => bursts.filter((burst) => burst.id !== id));
  }, []);

  const onShotImpact: ShotImpactHandler = ({ distance, point }) => {
    const result = hitZombie(zombieRef.current, distance);
    if (!result.reacted) return null;
    zombieRef.current = result.state;
    setZombie(result.state);
    setBloodBursts((bursts) => [...bursts, createBloodBurst(nextBurstIdRef.current++, point)]);

    const rigidBody = bodyRef.current;
    if (result.state.dead && rigidBody) {
      rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }
    applyBehavior(interruptZombieBehavior(behaviorRef.current, result.state.dead), true);
    return 'wall';
  };

  useFrame((_, delta) => {
    const safeFrame = Number.isFinite(delta) && delta > 0 && delta <= MAX_FRAME_DELTA;
    const attackAction = actionsRef.current.attack;
    const previousAttackTime = attackAction?.time ?? 0;
    if (active && safeFrame) mixerRef.current?.update(delta);
    if (
      active &&
      safeFrame &&
      behaviorRef.current.mode === 'attack' &&
      attackAction &&
      attackAction.time < previousAttackTime
    ) {
      zombieAudio.synchronizeAttackCycle();
    }

    const rigidBody = bodyRef.current;
    if (!rigidBody || !active) return;
    if (!safeFrame) {
      const velocity = rigidBody.linvel();
      rigidBody.setLinvel(
        { x: 0, y: Number.isFinite(velocity.y) ? velocity.y : 0, z: 0 },
        true,
      );
      return;
    }

    const deathDuration = actionsRef.current.dying?.getClip().duration ?? 0;
    if (behaviorRef.current.mode === 'dead') {
      const nextBehavior = advanceZombieBehavior(behaviorRef.current, {
        delta,
        distanceToPlayer: Infinity,
        hitDuration: 0,
      });
      behaviorRef.current = nextBehavior;
      if (isZombieCorpseExpired(nextBehavior, deathDuration)) onRemoved();
      return;
    }

    const position = rigidBody.translation();
    const toPlayer = {
      x: camera.position.x - position.x,
      z: camera.position.z - position.z,
    };
    const distance = Math.hypot(toPlayer.x, toPlayer.z);
    const hitDuration = actionsRef.current.hit?.getClip().duration ?? 0;
    applyBehavior(
      advanceZombieBehavior(behaviorRef.current, {
        delta,
        distanceToPlayer: distance,
        hitDuration,
      }),
    );

    const velocity = rigidBody.linvel();
    const verticalVelocity = Number.isFinite(velocity.y) ? velocity.y : 0;
    if (!Number.isFinite(distance) || distance <= 0 || behaviorRef.current.mode !== 'chase') {
      rigidBody.setLinvel({ x: 0, y: verticalVelocity, z: 0 }, true);
      if (behaviorRef.current.mode === 'attack' && visualRef.current) {
        const targetAngle = Math.atan2(toPlayer.x, toPlayer.z);
        const turn = normalizedAngleDelta(visualRef.current.rotation.y, targetAngle);
        visualRef.current.rotation.y +=
          Math.sign(turn) * Math.min(Math.abs(turn), TURN_SPEED_RADIANS * delta);
      }
      return;
    }

    const isBlocked = (direction: PlanarDirection, maximumDistance: number) => {
      const perpendicularX = direction.z;
      const perpendicularZ = -direction.x;
      for (const offset of STEERING_RAY_OFFSETS) {
        obstacleRay.origin.x = position.x + perpendicularX * offset;
        obstacleRay.origin.y = position.y + COLLIDER_CENTER_Y;
        obstacleRay.origin.z = position.z + perpendicularZ * offset;
        obstacleRay.dir.x = direction.x;
        obstacleRay.dir.y = 0;
        obstacleRay.dir.z = direction.z;
        const hit = world.castRay(
          obstacleRay,
          maximumDistance,
          true,
          rapier.QueryFilterFlags.EXCLUDE_DYNAMIC,
          undefined,
          undefined,
          rigidBody,
        );
        if (hit && hit.timeOfImpact < maximumDistance - RAY_HIT_TOLERANCE) return true;
      }
      return false;
    };
    const steering = selectZombieSteering(
      toPlayer,
      distance,
      steeringSideRef.current,
      isBlocked,
    );
    steeringSideRef.current = steering.side;
    rigidBody.setLinvel(
      {
        x: steering.direction.x * ZOMBIE_MOVE_SPEED,
        y: verticalVelocity,
        z: steering.direction.z * ZOMBIE_MOVE_SPEED,
      },
      true,
    );
    if (visualRef.current && (steering.direction.x !== 0 || steering.direction.z !== 0)) {
      const targetAngle = Math.atan2(steering.direction.x, steering.direction.z);
      const turn = normalizedAngleDelta(visualRef.current.rotation.y, targetAngle);
      visualRef.current.rotation.y +=
        Math.sign(turn) * Math.min(Math.abs(turn), TURN_SPEED_RADIANS * delta);
    }
  });

  return (
    <>
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
      {bloodBursts.map((burst) => (
        <BloodBurstEffect
          key={burst.id}
          burst={burst}
          onComplete={() => removeBloodBurst(burst.id)}
        />
      ))}
    </>
  );
}

export function Zombie({ active }: { active: boolean }) {
  const [present, setPresent] = useState(true);
  const remove = useCallback(() => setPresent(false), []);
  return present ? <ZombieActor active={active} onRemoved={remove} /> : null;
}
