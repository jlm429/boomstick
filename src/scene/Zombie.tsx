import { useFBX } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import {
  CapsuleCollider,
  RigidBody,
  useRapier,
  type RapierRigidBody,
} from '@react-three/rapier';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
import {
  AnimationMixer,
  BufferAttribute,
  Group,
  LoopOnce,
  LoopRepeat,
  Mesh,
  Points,
  PointsMaterial,
  Vector3,
} from 'three';
import {
  BITE_BURST_CAMERA_DISTANCE,
  BITE_PARTICLE_COUNT,
  BITE_PARTICLE_SIZE,
  biteBurstOpacity,
  createBiteBurst,
  isBiteBurstComplete,
  type BiteBurst,
} from '../game/biteParticles';
import {
  BLOOD_PARTICLE_SIZE,
  bloodBurstOpacity,
  createBloodBurst,
  isBloodBurstComplete,
  type BloodBurst,
} from '../game/bloodParticles';
import { MAX_FRAME_DELTA } from '../game/constants';
import type { ShotImpactBatchHandler } from '../game/impacts';
import {
  ZOMBIE_COLLIDER_RADIUS,
  advanceZombieBehavior,
  createZombieBehaviorState,
  createZombieMotionVariation,
  createZombieState,
  hitZombieWithPellets,
  interruptZombieBehavior,
  isZombieCorpseExpired,
  isZombieSteeringBlocked,
  selectZombieFacingDirection,
  selectZombieSteering,
  zombieMovementSpeed,
  type PlanarDirection,
  type ZombieBehaviorMode,
  type ZombieBehaviorState,
  type ZombieSteeringSide,
  type TrainingZombieSpawn,
} from '../game/zombie';
import { WEAK_ZOMBIE_ATTACK, ZombieAttackController } from '../game/zombieAttack';
import {
  shouldZombieRepositionToSlot,
  ZombieAttackSlotCoordinator,
  updateZombieSlotSettlement,
} from '../game/zombieAttackSlots';
import {
  applyZombieAnimationTimeScales,
  createInitialZombieWalkPhaseApplier,
  type ZombieActions,
  type ZombieAnimation,
} from './zombieAnimation';
import { ZombieAttackAudio } from './zombieAudio';
import {
  createZombieModelInstance,
  disposeZombieModelInstance,
  prepareZombieAnimationClips,
  warmZombieModelAsset,
  ZOMBIE_ASSET_URLS,
} from './zombieAssets';
import { useEffectAudio } from './AudioContext';

const MODEL_SCALE = 0.01;
const MODEL_FLOOR_OFFSET = 0.16;
const COLLIDER_HALF_HEIGHT = 0.6;
const COLLIDER_RADIUS = ZOMBIE_COLLIDER_RADIUS;
const COLLIDER_CENTER_Y = COLLIDER_HALF_HEIGHT + COLLIDER_RADIUS;
const ANIMATION_BLEND_SECONDS = 0.12;
const TURN_SPEED_RADIANS = 7;
const biteDirection = new Vector3();

const animationForMode = (mode: ZombieBehaviorMode): ZombieAnimation => {
  if (mode === 'chase') return 'run';
  if (mode === 'dead') return 'dying';
  return mode;
};

const normalizedAngleDelta = (from: number, to: number) =>
  Math.atan2(Math.sin(to - from), Math.cos(to - from));

function BloodBurstEffect({
  active,
  burst,
  onComplete,
}: {
  active: boolean;
  burst: BloodBurst;
  onComplete: () => void;
}) {
  const elapsedRef = useRef(0);
  const completedRef = useRef(false);
  const positionAttributeRef = useRef<BufferAttribute>(null);
  const materialRef = useRef<PointsMaterial>(null);
  const positions = useMemo(() => new Float32Array(burst.particles.length * 3), [burst]);

  useFrame((_, delta) => {
    if (!active || completedRef.current || !Number.isFinite(delta) || delta <= 0) return;
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
        size={BLOOD_PARTICLE_SIZE}
        sizeAttenuation
        transparent
        depthWrite={false}
      />
    </points>
  );
}

function BiteBurstEffect({
  active,
  burstRef,
}: {
  active: boolean;
  burstRef: MutableRefObject<BiteBurst | null>;
}) {
  const elapsedRef = useRef(0);
  const renderedBurstIdRef = useRef<number | null>(null);
  const pointsRef = useRef<Points>(null);
  const positionAttributeRef = useRef<BufferAttribute>(null);
  const materialRef = useRef<PointsMaterial>(null);
  const positions = useMemo(() => new Float32Array(BITE_PARTICLE_COUNT * 3), []);

  useFrame((_, delta) => {
    const burst = burstRef.current;
    const points = pointsRef.current;
    if (!burst || !points) return;
    if (renderedBurstIdRef.current !== burst.id) {
      renderedBurstIdRef.current = burst.id;
      elapsedRef.current = 0;
      points.position.set(burst.origin.x, burst.origin.y, burst.origin.z);
      points.visible = true;
    }
    if (!active || !Number.isFinite(delta) || delta <= 0) return;
    elapsedRef.current += delta;
    if (isBiteBurstComplete(elapsedRef.current)) {
      points.visible = false;
      if (burstRef.current?.id === burst.id) burstRef.current = null;
      return;
    }

    const elapsed = elapsedRef.current;
    burst.particles.forEach(({ velocity }, index) => {
      const positionIndex = index * 3;
      positions[positionIndex] = velocity[0] * elapsed;
      positions[positionIndex + 1] = velocity[1] * elapsed;
      positions[positionIndex + 2] = velocity[2] * elapsed;
    });
    if (positionAttributeRef.current) positionAttributeRef.current.needsUpdate = true;
    if (materialRef.current) materialRef.current.opacity = biteBurstOpacity(elapsed);
  });

  return (
    <points ref={pointsRef} visible={false} raycast={() => null}>
      <bufferGeometry>
        <bufferAttribute
          ref={positionAttributeRef}
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        color="#c91f28"
        opacity={0.78}
        size={BITE_PARTICLE_SIZE}
        sizeAttenuation
        transparent
        depthTest={false}
        depthWrite={false}
      />
    </points>
  );
}

function ZombieActor({
  active,
  attackSlots,
  playerAlive,
  spawn,
  onPlayerDamage,
  onRemoved,
}: {
  active: boolean;
  attackSlots: ZombieAttackSlotCoordinator;
  playerAlive: boolean;
  spawn: TrainingZombieSpawn;
  onPlayerDamage: (damage: number) => void;
  onRemoved: () => void;
}) {
  const bodyRef = useRef<RapierRigidBody>(null);
  const attackControllerRef = useRef<ZombieAttackController>(null);
  const activeRef = useRef(active);
  const playerAliveRef = useRef(playerAlive);
  const visualRef = useRef<Group>(null);
  const mixerRef = useRef<AnimationMixer>(null);
  const actionsRef = useRef<ZombieActions>({});
  const currentActionRef = useRef<ZombieAnimation | null>(null);
  const animationRef = useRef<ZombieAnimation>('idle');
  const behaviorRef = useRef<ZombieBehaviorState>(createZombieBehaviorState());
  const removedRef = useRef(false);
  const steeringSideRef = useRef<ZombieSteeringSide>(null);
  const slotAssignmentRef = useRef<number | null>(null);
  const slotSettledRef = useRef(false);
  const nextBurstIdRef = useRef(1);
  const pelletDistancesRef = useRef<number[]>([]);
  const nextBiteBurstIdRef = useRef(1);
  const biteBurstRef = useRef<BiteBurst | null>(null);
  const [motionVariation] = useState(createZombieMotionVariation);
  const [applyInitialWalkPhase] = useState(() =>
    createInitialZombieWalkPhaseApplier(motionVariation.walkPhase),
  );
  const movementSpeed = zombieMovementSpeed(motionVariation);
  const zombieRef = useRef(createZombieState());
  const [zombie, setZombie] = useState(createZombieState);
  const [animation, setAnimation] = useState<ZombieAnimation>('idle');
  const [animationRevision, setAnimationRevision] = useState(0);
  const [bloodBursts, setBloodBursts] = useState<readonly BloodBurst[]>([]);
  const effectAudio = useEffectAudio();
  const [zombieAudio] = useState(() => new ZombieAttackAudio(effectAudio));
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
  const model = useMemo(() => createZombieModelInstance(modelAsset), [modelAsset]);
  const clips = useMemo(
    () =>
      prepareZombieAnimationClips(modelAsset, {
        idle: idleAsset,
        run: runAsset,
        attack: attackAsset,
        hit: hitAsset,
        dying: dyingAsset,
      }),
    [attackAsset, dyingAsset, hitAsset, idleAsset, modelAsset, runAsset],
  );
  useEffect(() => () => disposeZombieModelInstance(model), [model]);
  useEffect(() => {
    const attackController = new ZombieAttackController(WEAK_ZOMBIE_ATTACK, {
      isHitValid: () =>
        activeRef.current &&
        playerAliveRef.current &&
        !zombieRef.current.dead &&
        behaviorRef.current.mode === 'attack',
      applyDamage: (damage) => {
        onPlayerDamage(damage);
        camera.getWorldDirection(biteDirection);
        biteBurstRef.current = createBiteBurst(nextBiteBurstIdRef.current++, {
          x: camera.position.x + biteDirection.x * BITE_BURST_CAMERA_DISTANCE,
          y: camera.position.y + biteDirection.y * BITE_BURST_CAMERA_DISTANCE,
          z: camera.position.z + biteDirection.z * BITE_BURST_CAMERA_DISTANCE,
        });
      },
    });
    attackControllerRef.current = attackController;
    return () => {
      attackController.dispose();
      if (attackControllerRef.current === attackController) attackControllerRef.current = null;
    };
  }, [camera, onPlayerDamage]);

  useLayoutEffect(() => {
    activeRef.current = active;
    playerAliveRef.current = playerAlive;
    if (!active || !playerAlive) {
      attackControllerRef.current?.cancel();
      attackSlots.release(spawn.id);
      slotAssignmentRef.current = null;
      slotSettledRef.current = false;
    }
  }, [active, attackSlots, playerAlive, spawn.id]);

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
    if (active && playerAlive) {
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
  }, [active, playerAlive, zombieAudio]);

  const playAnimation = useCallback(
    (next: ZombieAnimation) => {
      const nextAction = actionsRef.current[next];
      if (!nextAction) return;
      const previousAction = currentActionRef.current
        ? actionsRef.current[currentActionRef.current]
        : undefined;
      if (previousAction && previousAction !== nextAction) {
        previousAction.fadeOut(ANIMATION_BLEND_SECONDS);
      }
      nextAction.reset();
      if (next === 'run') applyInitialWalkPhase(nextAction);
      nextAction.enabled = true;
      nextAction.clampWhenFinished = next === 'hit' || next === 'dying';
      nextAction.setLoop(
        nextAction.clampWhenFinished ? LoopOnce : LoopRepeat,
        nextAction.clampWhenFinished ? 1 : Infinity,
      );
      nextAction.fadeIn(ANIMATION_BLEND_SECONDS).play();
      currentActionRef.current = next;
    },
    [applyInitialWalkPhase],
  );

  useEffect(() => {
    const mixer = new AnimationMixer(model);
    mixerRef.current = mixer;
    const actions = Object.fromEntries(
      clips.map((clip) => [clip.name, mixer.clipAction(clip)]),
    ) as ZombieActions;
    applyZombieAnimationTimeScales(actions, motionVariation);
    actionsRef.current = actions;
    playAnimation('idle');
    return () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
      if (mixerRef.current === mixer) mixerRef.current = null;
      actionsRef.current = {};
      currentActionRef.current = null;
    };
  }, [clips, model, motionVariation, playAnimation]);

  useEffect(() => playAnimation(animation), [animation, animationRevision, playAnimation]);
  useEffect(() => () => zombieAudio.stop(), [zombieAudio]);
  useEffect(
    () => () => {
      attackSlots.release(spawn.id);
    },
    [attackSlots, spawn.id],
  );

  const removeBloodBurst = useCallback((id: number) => {
    setBloodBursts((bursts) => bursts.filter((burst) => burst.id !== id));
  }, []);

  const onShotImpacts: ShotImpactBatchHandler = (impacts) => {
    const pelletDistances = pelletDistancesRef.current;
    pelletDistances.length = impacts.length;
    for (let index = 0; index < impacts.length; index += 1) {
      pelletDistances[index] = impacts[index].distance;
    }
    const result = hitZombieWithPellets(zombieRef.current, pelletDistances);
    if (result.reactedHits === 0) return null;
    const nextBursts: BloodBurst[] = [];
    for (let index = 0; index < result.reactedHits; index += 1) {
      nextBursts.push(createBloodBurst(nextBurstIdRef.current++, impacts[index].point));
    }
    zombieRef.current = result.state;
    setZombie(result.state);
    setBloodBursts((bursts) => [...bursts, ...nextBursts]);

    const rigidBody = bodyRef.current;
    if (result.state.dead && rigidBody) {
      rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }
    if (result.state.dead) {
      attackControllerRef.current?.cancel();
      attackSlots.release(spawn.id);
      slotAssignmentRef.current = null;
      slotSettledRef.current = false;
    }
    applyBehavior(interruptZombieBehavior(behaviorRef.current, result.state.dead), true);
    return 'wall';
  };

  useFrame((_, delta) => {
    const safeFrame = Number.isFinite(delta) && delta > 0 && delta <= MAX_FRAME_DELTA;
    const attackAction =
      behaviorRef.current.mode === 'attack' && currentActionRef.current === 'attack'
        ? actionsRef.current.attack
        : undefined;
    const previousAttackTime = attackAction?.time ?? 0;
    if (active && safeFrame) mixerRef.current?.update(delta);

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
        directPathClear: false,
        distanceToPlayer: Infinity,
        hitDuration: 0,
      });
      behaviorRef.current = nextBehavior;
      if (isZombieCorpseExpired(nextBehavior, deathDuration) && !removedRef.current) {
        removedRef.current = true;
        onRemoved();
      }
      return;
    }

    const position = rigidBody.translation();
    const toPlayer = {
      x: camera.position.x - position.x,
      z: camera.position.z - position.z,
    };
    const distance = Math.hypot(toPlayer.x, toPlayer.z);
    const isBlocked = (direction: PlanarDirection, maximumDistance: number) =>
      isZombieSteeringBlocked(
        position,
        direction,
        maximumDistance,
        (origin, rayDirection, rayDistance) => {
          obstacleRay.origin.x = origin.x;
          obstacleRay.origin.y = position.y + COLLIDER_CENTER_Y;
          obstacleRay.origin.z = origin.z;
          obstacleRay.dir.x = rayDirection.x;
          obstacleRay.dir.y = 0;
          obstacleRay.dir.z = rayDirection.z;
          return (
            world.castRay(
              obstacleRay,
              rayDistance,
              true,
              rapier.QueryFilterFlags.EXCLUDE_DYNAMIC,
              undefined,
              undefined,
              rigidBody,
            )?.timeOfImpact ?? null
          );
        },
      );
    const directPathClear =
      distance <= 0 ||
      !isBlocked({ x: toPlayer.x / distance, z: toPlayer.z / distance }, distance);
    const hitAction = actionsRef.current.hit;
    const hitDuration = hitAction ? hitAction.getClip().duration / hitAction.timeScale : 0;
    applyBehavior(
      advanceZombieBehavior(behaviorRef.current, {
        delta,
        directPathClear,
        distanceToPlayer: distance,
        hitDuration,
      }),
    );
    const pursuing =
      playerAlive &&
      (behaviorRef.current.mode === 'chase' || behaviorRef.current.mode === 'attack');
    const slotTarget = pursuing ? attackSlots.claim(spawn.id, position, camera.position) : null;
    if (!pursuing) {
      attackSlots.release(spawn.id);
      slotAssignmentRef.current = null;
      slotSettledRef.current = false;
    }
    const movementTarget = slotTarget?.position ?? camera.position;
    const toMovementTarget = {
      x: movementTarget.x - position.x,
      z: movementTarget.z - position.z,
    };
    const movementDistance = Math.hypot(toMovementTarget.x, toMovementTarget.z);
    const steering = selectZombieSteering(
      toMovementTarget,
      movementDistance,
      steeringSideRef.current,
      isBlocked,
    );
    steeringSideRef.current = steering.side;
    attackControllerRef.current?.update(
      behaviorRef.current.mode === 'attack' &&
        directPathClear &&
        distance <= WEAK_ZOMBIE_ATTACK.range,
      active && playerAlive,
    );

    if (behaviorRef.current.mode === 'attack' && attackAction) {
      if (attackAction.time < previousAttackTime) zombieAudio.synchronizeAttackCycle();
    }

    const velocity = rigidBody.linvel();
    const verticalVelocity = Number.isFinite(velocity.y) ? velocity.y : 0;
    if (slotTarget) {
      const assignment =
        slotTarget.kind === 'attack' ? slotTarget.index : -slotTarget.index - 1;
      if (slotAssignmentRef.current !== assignment) {
        slotAssignmentRef.current = assignment;
        slotSettledRef.current = false;
      }
      slotSettledRef.current = updateZombieSlotSettlement(
        slotSettledRef.current,
        position,
        slotTarget.position,
      );
    }
    const settled = slotTarget !== null && slotSettledRef.current;
    const repositioning = shouldZombieRepositionToSlot(behaviorRef.current.mode, settled);
    if (!Number.isFinite(movementDistance) || movementDistance <= 0 || !repositioning) {
      rigidBody.setLinvel({ x: 0, y: verticalVelocity, z: 0 }, true);
      if (behaviorRef.current.mode === 'attack' && visualRef.current) {
        const targetAngle = Math.atan2(toPlayer.x, toPlayer.z);
        const turn = normalizedAngleDelta(visualRef.current.rotation.y, targetAngle);
        visualRef.current.rotation.y +=
          Math.sign(turn) * Math.min(Math.abs(turn), TURN_SPEED_RADIANS * delta);
      }
      return;
    }

    rigidBody.setLinvel(
      {
        x: steering.direction.x * movementSpeed,
        y: verticalVelocity,
        z: steering.direction.z * movementSpeed,
      },
      true,
    );
    const facingDirection = selectZombieFacingDirection(
      behaviorRef.current.mode,
      toPlayer,
      steering.direction,
    );
    if (visualRef.current && (facingDirection.x !== 0 || facingDirection.z !== 0)) {
      const targetAngle = Math.atan2(facingDirection.x, facingDirection.z);
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
        position={[...spawn.position]}
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
          rotation={[0, spawn.rotation, 0]}
          scale={MODEL_SCALE}
          userData={{ onShotImpacts }}
          dispose={null}
        >
          <primitive object={model} />
        </group>
      </RigidBody>
      {bloodBursts.map((burst) => (
        <BloodBurstEffect
          key={burst.id}
          active={active}
          burst={burst}
          onComplete={() => removeBloodBurst(burst.id)}
        />
      ))}
      <BiteBurstEffect active={active} burstRef={biteBurstRef} />
    </>
  );
}

export function ZombieAssetWarmup() {
  const model = useFBX(ZOMBIE_ASSET_URLS.model);
  const idle = useFBX(ZOMBIE_ASSET_URLS.idle);
  const run = useFBX(ZOMBIE_ASSET_URLS.run);
  const attack = useFBX(ZOMBIE_ASSET_URLS.attack);
  const hit = useFBX(ZOMBIE_ASSET_URLS.hit);
  const dying = useFBX(ZOMBIE_ASSET_URLS.dying);
  useEffect(() => {
    warmZombieModelAsset(model);
    prepareZombieAnimationClips(model, { idle, run, attack, hit, dying });
  }, [attack, dying, hit, idle, model, run]);
  return null;
}

export function Zombie({
  active,
  attackSlots,
  playerAlive,
  spawn,
  onPlayerDamage,
  onRemoved,
}: {
  active: boolean;
  attackSlots: ZombieAttackSlotCoordinator;
  playerAlive: boolean;
  spawn: TrainingZombieSpawn;
  onPlayerDamage: (damage: number) => void;
  onRemoved: () => void;
}) {
  const [present, setPresent] = useState(true);
  const remove = useCallback(() => {
    setPresent(false);
    onRemoved();
  }, [onRemoved]);
  return present ? (
    <ZombieActor
      active={active}
      attackSlots={attackSlots}
      playerAlive={playerAlive}
      spawn={spawn}
      onPlayerDamage={onPlayerDamage}
      onRemoved={remove}
    />
  ) : null;
}
