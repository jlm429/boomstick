import { useFBX } from '@react-three/drei';
import { addAfterEffect, useFrame, useThree } from '@react-three/fiber';
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
import { MAX_FRAME_DELTA } from '../game/constants';
import type { ShotImpactBatchHandler } from '../game/impacts';
import {
  ZOMBIE_COLLIDER_RADIUS,
  ZOMBIE_MAX_HEALTH,
  advanceZombieBehavior,
  createZombieBehaviorState,
  createZombieMotionVariation,
  createZombieState,
  hitZombieWithPellets,
  interruptZombieBehavior,
  isZombieCorpseExpired,
  isZombieFacingPlayer,
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
import type { ZombieAttackSlotCoordinator } from '../game/zombieAttackSlots';
import {
  applyZombieAnimationTimeScales,
  createInitialZombieWalkPhaseApplier,
  transitionZombieAnimation,
  updateZombieAnimationBlend,
  type ZombieActions,
  type ZombieAnimation,
} from './zombieAnimation';
import { ZombieAttackAudio } from './zombieAudio';
import {
  createZombieModelInstance,
  disposeZombieModelInstance,
  prepareZombieAnimationClips,
  zombieModelTextures,
  ZOMBIE_ASSET_URLS,
} from './zombieAssets';
import { useEffectAudio } from './AudioContext';
import { zombieHitFeedback } from './zombieMaterials';
import { ZombieFootContact } from './ZombieFootContact';
import { ImpactParticles } from './ImpactParticles';
import { BLOOD_POOL_CAPACITY, ImpactParticlePool } from './particlePool';
import { ZombiePoseOverlay } from './zombiePose';
import { createZombieObstacleProbe } from './zombieObstacleProbe';

const MODEL_SCALE = 0.01;
const MODEL_FLOOR_OFFSET = 0.16;
const COLLIDER_HALF_HEIGHT = 0.6;
const COLLIDER_RADIUS = ZOMBIE_COLLIDER_RADIUS;
const COLLIDER_CENTER_Y = COLLIDER_HALF_HEIGHT + COLLIDER_RADIUS;
const TURN_SPEED_RADIANS = 7;
const SLOT_APPROACH_DISTANCE = 2.5;
const NO_MOVEMENT = { x: 0, z: 0 };
const biteDirection = new Vector3();

const animationForMode = (mode: ZombieBehaviorMode): ZombieAnimation => {
  if (mode === 'chase') return 'run';
  if (mode === 'dead') return 'dying';
  return mode;
};

const normalizedAngleDelta = (from: number, to: number) =>
  Math.atan2(Math.sin(to - from), Math.cos(to - from));

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
  const [bloodPool] = useState(() => new ImpactParticlePool(BLOOD_POOL_CAPACITY));
  const hitFeedback = useRef(0);
  const hitOrigin = useRef(new Vector3());
  const hitNormal = useRef(new Vector3());
  const effectAudio = useEffectAudio();
  const [zombieAudio] = useState(() => new ZombieAttackAudio(effectAudio));
  const { camera } = useThree();
  const { rapier, world } = useRapier();
  const obstacleProbe = useMemo(
    () => createZombieObstacleProbe(rapier, world),
    [rapier, world],
  );
  const modelAsset = useFBX(ZOMBIE_ASSET_URLS.model);
  const idleAsset = useFBX(ZOMBIE_ASSET_URLS.idle);
  const runAsset = useFBX(ZOMBIE_ASSET_URLS.run);
  const attackAsset = useFBX(ZOMBIE_ASSET_URLS.attack);
  const hitAsset = useFBX(ZOMBIE_ASSET_URLS.hit);
  const dyingAsset = useFBX(ZOMBIE_ASSET_URLS.dying);
  const model = useMemo(() => createZombieModelInstance(modelAsset), [modelAsset]);
  const pose = useMemo(
    () => new ZombiePoseOverlay(model, motionVariation.walkPhase),
    [model, motionVariation.walkPhase],
  );
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
        pose.struckPlayer();
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
  }, [camera, onPlayerDamage, pose]);

  useLayoutEffect(() => {
    activeRef.current = active;
    playerAliveRef.current = playerAlive;
    if (!active || !playerAlive) {
      attackControllerRef.current?.cancel();
      attackSlots.release(spawn.id);
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
    if (next.mode === 'dead') zombieAudio.stop();
    if (next.mode === 'dead' || next.mode === 'hit') {
      changeAnimation(animationForMode(next.mode), restartAnimation);
    }
  };

  useEffect(() => {
    if (active && playerAlive) return;
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
      if (
        !transitionZombieAnimation(
          actionsRef.current,
          currentActionRef.current,
          next,
          applyInitialWalkPhase,
        )
      )
        return;
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
      pose.restore();
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
      if (mixerRef.current === mixer) mixerRef.current = null;
      actionsRef.current = {};
      currentActionRef.current = null;
    };
  }, [clips, model, motionVariation, playAnimation, pose]);

  useEffect(() => playAnimation(animation), [animation, animationRevision, playAnimation]);
  useEffect(() => () => zombieAudio.stop(), [zombieAudio]);
  useEffect(
    () => () => {
      attackSlots.release(spawn.id);
    },
    [attackSlots, spawn.id],
  );

  const onShotImpacts: ShotImpactBatchHandler = (impacts) => {
    const pelletDistances = pelletDistancesRef.current;
    pelletDistances.length = impacts.length;
    for (let index = 0; index < impacts.length; index += 1) {
      pelletDistances[index] = impacts[index].distance;
    }
    const result = hitZombieWithPellets(zombieRef.current, pelletDistances);
    if (result.reactedHits === 0) return null;
    const origin = hitOrigin.current.set(0, 0, 0);
    for (let index = 0; index < result.reactedHits; index += 1) {
      const point = impacts[index].point;
      origin.x += point.x;
      origin.y += point.y;
      origin.z += point.z;
    }
    origin.multiplyScalar(1 / result.reactedHits);
    hitNormal.current.copy(camera.position).sub(origin).normalize();
    const strength = Math.min(1, result.damage / ZOMBIE_MAX_HEALTH);
    bloodPool.emit('blood', origin, hitNormal.current, Math.random, strength);
    const facing = visualRef.current?.rotation.y ?? spawn.rotation;
    pose.hit(
      strength,
      hitNormal.current.x * Math.cos(facing) - hitNormal.current.z * Math.sin(facing),
    );
    hitFeedback.current = 1;
    zombieHitFeedback(model, 1);
    zombieRef.current = result.state;
    setZombie(result.state);

    const rigidBody = bodyRef.current;
    if (result.state.dead && rigidBody) {
      rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }
    if (result.state.dead) {
      attackControllerRef.current?.cancel();
      attackSlots.release(spawn.id);
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
    if (active && safeFrame) {
      pose.restore();
      updateZombieAnimationBlend(actionsRef.current, delta);
      mixerRef.current?.update(delta);
      pose.apply(actionsRef.current, delta, attackControllerRef.current?.getPhase() ?? 'idle');
      if (hitFeedback.current > 0) {
        hitFeedback.current = Math.max(0, hitFeedback.current - delta / 0.14);
        zombieHitFeedback(model, hitFeedback.current);
      }
    }
    if (hitFeedback.current > 0 && (!playerAlive || (active && !safeFrame))) {
      hitFeedback.current = 0;
      zombieHitFeedback(model, 0);
    }

    const rigidBody = bodyRef.current;
    if (!rigidBody || !active) return;
    if (!safeFrame) {
      attackControllerRef.current?.update(false, false);
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
    obstacleProbe.setOrigin(position.x, position.y + COLLIDER_CENTER_Y, position.z);
    const directPathClear =
      distance <= 0 ||
      (distance <= WEAK_ZOMBIE_ATTACK.range &&
        obstacleProbe.hasClearBitePath(toPlayer, distance));
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
    const mode = behaviorRef.current.mode;
    const nearPlayer =
      playerAlive &&
      distance <= SLOT_APPROACH_DISTANCE &&
      (mode === 'chase' || mode === 'attack');
    const slotTarget = nearPlayer
      ? attackSlots.claim(spawn.id, position, camera.position)
      : null;
    if (!nearPlayer) attackSlots.release(spawn.id);
    const movementTarget = slotTarget?.position ?? camera.position;
    const toMovementTarget = {
      x: movementTarget.x - position.x,
      z: movementTarget.z - position.z,
    };
    const movementDistance = Math.hypot(toMovementTarget.x, toMovementTarget.z);
    let movementDirection: PlanarDirection = NO_MOVEMENT;
    let distanceToGoal = movementDistance;
    if (mode === 'chase' && playerAlive) {
      let steering = selectZombieSteering(
        toMovementTarget,
        movementDistance,
        steeringSideRef.current,
        obstacleProbe.isBlocked,
      );
      // A player backed against cover can move a reserved slot inside that cover.
      if (slotTarget && !steering.directPathClear) {
        steering = selectZombieSteering(
          toPlayer,
          distance,
          steeringSideRef.current,
          obstacleProbe.isBlocked,
        );
        distanceToGoal = distance;
      }
      movementDirection = steering.direction;
      steeringSideRef.current = steering.side;
    }
    const facingDirection = selectZombieFacingDirection(mode, toPlayer, movementDirection);
    let speed = 0;
    if (visualRef.current && (facingDirection.x !== 0 || facingDirection.z !== 0)) {
      const targetAngle = Math.atan2(facingDirection.x, facingDirection.z);
      const turn = normalizedAngleDelta(visualRef.current.rotation.y, targetAngle);
      visualRef.current.rotation.y +=
        Math.sign(turn) * Math.min(Math.abs(turn), TURN_SPEED_RADIANS * delta);
      if (mode === 'chase') {
        speed =
          Math.min(movementSpeed, distanceToGoal / delta) *
          Math.max(0, Math.cos(targetAngle - visualRef.current.rotation.y));
      }
    }
    const velocity = rigidBody.linvel();
    rigidBody.setLinvel(
      {
        x: movementDirection.x * speed,
        y: Number.isFinite(velocity.y) ? velocity.y : 0,
        z: movementDirection.z * speed,
      },
      true,
    );
    const aligned =
      mode === 'attack' &&
      visualRef.current !== null &&
      isZombieFacingPlayer(visualRef.current.rotation.y, toPlayer);
    attackControllerRef.current?.update(aligned, active && playerAlive);
    if (aligned) {
      zombieAudio.enterAttack();
      if (attackAction && attackAction.time < previousAttackTime) {
        zombieAudio.synchronizeAttackCycle();
      }
    } else {
      zombieAudio.leaveAttack();
    }
    if (mode !== 'hit') {
      changeAnimation(aligned ? 'attack' : speed > 0 ? 'run' : 'idle');
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
      <ZombieFootContact model={model} active={active} />
      <ImpactParticles pool={bloodPool} active={active} clear={!playerAlive} />
      <BiteBurstEffect active={active} burstRef={biteBurstRef} />
    </>
  );
}

export function ZombieAssetWarmup() {
  const { camera, gl, scene } = useThree();
  const model = useFBX(ZOMBIE_ASSET_URLS.model);
  const idle = useFBX(ZOMBIE_ASSET_URLS.idle);
  const run = useFBX(ZOMBIE_ASSET_URLS.run);
  const attack = useFBX(ZOMBIE_ASSET_URLS.attack);
  const hit = useFBX(ZOMBIE_ASSET_URLS.hit);
  const dying = useFBX(ZOMBIE_ASSET_URLS.dying);
  useEffect(() => {
    prepareZombieAnimationClips(model, { idle, run, attack, hit, dying });
    const preview = createZombieModelInstance(model);
    const textures = zombieModelTextures(preview);
    const imageWaitDeadline = performance.now() + 2000;
    let cancelled = false;
    const compileFrame = requestAnimationFrame(() => gl.compile(preview, camera, scene));
    let uploadFrame = 0;
    let removeAfterRender: (() => void) | undefined;
    const removePreview = () => {
      preview.removeFromParent();
      removeAfterRender?.();
    };
    const renderPreview = () => {
      // One draw beneath the floor exercises the skinned shadow and draw programs.
      preview.position.y = -4;
      preview.scale.setScalar(MODEL_SCALE);
      preview.traverse((child) => {
        if (!(child instanceof Mesh)) return;
        child.frustumCulled = false;
        child.raycast = () => null;
      });
      scene.add(preview);
      removeAfterRender = addAfterEffect(removePreview);
    };

    // FBX can resolve while its embedded images are still loading.
    const uploadNextTexture = () => {
      const texture = [...textures].find(({ image }) => image instanceof HTMLImageElement);
      if (!texture) {
        if (textures.size > 0 && performance.now() < imageWaitDeadline) {
          uploadFrame = requestAnimationFrame(uploadNextTexture);
        } else {
          renderPreview();
        }
        return;
      }
      textures.delete(texture);
      const image = texture.image as HTMLImageElement;
      void image.decode().then(
        () => {
          if (cancelled) return;
          uploadFrame = requestAnimationFrame(() => {
            gl.initTexture(texture);
            uploadFrame = requestAnimationFrame(uploadNextTexture);
          });
        },
        () => {
          if (!cancelled) uploadNextTexture();
        },
      );
    };
    uploadFrame = requestAnimationFrame(uploadNextTexture);
    return () => {
      cancelled = true;
      cancelAnimationFrame(compileFrame);
      cancelAnimationFrame(uploadFrame);
      removePreview();
      disposeZombieModelInstance(preview);
    };
  }, [attack, camera, dying, gl, hit, idle, model, run, scene]);
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
