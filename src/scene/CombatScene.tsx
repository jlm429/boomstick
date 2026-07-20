import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import {
  Group,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PointLight,
  Raycaster,
  Vector3,
} from 'three';
import {
  INITIAL_WEAPON_STATE,
  RELOAD_SECONDS,
  canFireWeapon,
  completeReload,
  consumeRound,
  firstShotTarget,
  isReloadInput,
  pelletOffsets,
  reloadPoseAt,
  startReload,
  type ReloadPose,
  type WeaponState,
} from '../game/shooting';
import {
  createArenaImpactState,
  hitBreakableLight,
  selectImpactSound,
  type ImpactSound,
  type ShotImpactHandler,
} from '../game/impacts';
import {
  advanceEncounterCountdown,
  createEncounterState,
  createTrainingTargetHealth,
  hasEncounterPresentationChanged,
  startEncounterCountdown,
  type EncounterState,
} from '../game/encounter';
import {
  ARENA_TARGETS,
  TARGET_HIT_RADIUS,
  hitTarget,
  isTargetDepleted,
  type TargetDefinition,
} from '../game/targets';
import { BreakableLights } from './Arena';
import { WeaponAudio } from './weaponAudio';

const cameraDirection = new Vector3();
const cameraRight = new Vector3();
const cameraUp = new Vector3();
const pelletDirection = new Vector3();
const targetLocalHitPoint = new Vector3();
const raycaster = new Raycaster();
const HIT_FLASH_SECONDS = 0.18;
const MUZZLE_FLASH_SECONDS = 0.075;
const TARGET_HEALTH_METER_WIDTH = 1.04;
const TARGET_HEALTH_METER_HEIGHT = 0.1;
const TARGET_HEALTH_METER_FRAME_WIDTH = 1.12;
const TARGET_HEALTH_METER_FRAME_HEIGHT = 0.18;
const TARGET_HEALTH_METER_Y_GAP = 0.3;
const TARGET_HEALTH_METER_Z_OFFSET = 0.08;

function shotImpactHandler(object: Object3D): ShotImpactHandler | null {
  let current: Object3D | null = object;
  while (current) {
    const onShotImpact = current.userData.onShotImpact as ShotImpactHandler | undefined;
    if (onShotImpact) return onShotImpact;
    current = current.parent;
  }
  return null;
}

function TargetVisual({
  target,
  onHealthChange,
}: {
  target: TargetDefinition;
  onHealthChange: (targetId: string, health: number) => void;
}) {
  const groupRef = useRef<Group>(null);
  const meterRef = useRef<Group>(null);
  const materialRef = useRef<MeshStandardMaterial>(null);
  const hitAtRef = useRef<number | null>(null);
  const [health, setHealth] = useState(target.maximumHealth);
  const healthRef = useRef(health);
  const depleted = isTargetDepleted(health);
  const healthRatio = health / target.maximumHealth;

  useFrame(({ camera }) => {
    const elapsed =
      hitAtRef.current === null ? Infinity : performance.now() / 1000 - hitAtRef.current;
    const strength = Math.max(0, 1 - elapsed / HIT_FLASH_SECONDS);
    if (materialRef.current) {
      materialRef.current.emissiveIntensity = depleted ? strength * 2.5 : 0.25 + strength * 2.5;
    }
    if (meterRef.current) meterRef.current.quaternion.copy(camera.quaternion);
  });

  const onShotImpact: ShotImpactHandler = ({ distance, point }) => {
    if (!groupRef.current) return null;
    targetLocalHitPoint.set(point.x, point.y, point.z);
    groupRef.current.worldToLocal(targetLocalHitPoint);
    const result = hitTarget(
      healthRef.current,
      distance,
      targetLocalHitPoint,
      target.maximumHealth,
    );
    if (!result.reacted) return null;

    healthRef.current = result.health;
    setHealth(result.health);
    onHealthChange(target.id, result.health);
    hitAtRef.current = performance.now() / 1000;
    return 'wall';
  };

  return (
    <group ref={groupRef} position={[...target.position]} userData={{ onShotImpact }}>
      <mesh castShadow receiveShadow>
        <boxGeometry
          args={target.halfExtents.map((value) => value * 2) as [number, number, number]}
        />
        <meshStandardMaterial
          ref={materialRef}
          color={depleted ? '#484946' : '#d9e2d5'}
          emissive="#ff5c35"
          emissiveIntensity={depleted ? 0 : 0.25}
        />
      </mesh>
      <mesh position={[0, 0, target.halfExtents[2] + 0.012]}>
        <circleGeometry args={[TARGET_HIT_RADIUS, 24]} />
        <meshBasicMaterial color={depleted ? '#202321' : '#18252d'} />
      </mesh>
      <mesh position={[0, 0, target.halfExtents[2] + 0.02]}>
        <circleGeometry args={[0.23, 24]} />
        <meshBasicMaterial color={depleted ? '#665c3d' : '#ffbb45'} />
      </mesh>
      <group
        ref={meterRef}
        position={[
          0,
          target.halfExtents[1] + TARGET_HEALTH_METER_Y_GAP,
          target.halfExtents[2] + TARGET_HEALTH_METER_Z_OFFSET,
        ]}
      >
        <mesh raycast={() => null}>
          <planeGeometry
            args={[TARGET_HEALTH_METER_FRAME_WIDTH, TARGET_HEALTH_METER_FRAME_HEIGHT]}
          />
          <meshBasicMaterial color={depleted ? '#211714' : '#351713'} />
        </mesh>
        <mesh
          position={[-((1 - healthRatio) * TARGET_HEALTH_METER_WIDTH) / 2, 0, 0.006]}
          scale={[healthRatio, 1, 1]}
          raycast={() => null}
        >
          <planeGeometry args={[TARGET_HEALTH_METER_WIDTH, TARGET_HEALTH_METER_HEIGHT]} />
          <meshBasicMaterial color={depleted ? '#3c2922' : '#e55320'} />
        </mesh>
      </group>
    </group>
  );
}

export function TargetColliders() {
  return (
    <>
      {ARENA_TARGETS.map((target) => (
        <RigidBody
          key={target.id}
          type="fixed"
          colliders={false}
          position={[...target.position]}
        >
          <CuboidCollider args={[...target.halfExtents]} />
        </RigidBody>
      ))}
    </>
  );
}

function TargetVisuals({
  onHealthChange,
}: {
  onHealthChange: (targetId: string, health: number) => void;
}) {
  return (
    <>
      {ARENA_TARGETS.map((target) => (
        <TargetVisual key={target.id} target={target} onHealthChange={onHealthChange} />
      ))}
    </>
  );
}

function Shotgun({
  shotIdRef,
  weaponStateRef,
  reloadStartedAtRef,
}: {
  shotIdRef: MutableRefObject<number>;
  weaponStateRef: MutableRefObject<WeaponState>;
  reloadStartedAtRef: MutableRefObject<number>;
}) {
  const mesh = useRef<Group>(null);
  const muzzleFlash = useRef<Group>(null);
  const muzzleLight = useRef<PointLight>(null);
  const flashMaterial = useRef<MeshBasicMaterial>(null);
  const streakMaterial = useRef<MeshBasicMaterial>(null);
  const { camera } = useThree();
  const recoil = useRef(0);
  const flash = useRef(0);
  const renderedShotId = useRef(0);
  const reloadPoseRef = useRef<ReloadPose>({
    phase: 'complete',
    positionX: 0,
    positionY: 0,
    positionZ: 0,
    rotationX: 0,
    rotationZ: 0,
  });

  useFrame((_, delta) => {
    if (renderedShotId.current !== shotIdRef.current) {
      renderedShotId.current = shotIdRef.current;
      recoil.current = 1;
      flash.current = 1;
    }
    recoil.current = Math.max(0, recoil.current - delta * 6);
    flash.current = Math.max(0, flash.current - delta / MUZZLE_FLASH_SECONDS);
    if (muzzleFlash.current) {
      muzzleFlash.current.visible = flash.current > 0;
      muzzleFlash.current.scale.setScalar(0.7 + flash.current * 0.55);
    }
    if (flashMaterial.current) flashMaterial.current.opacity = flash.current;
    if (streakMaterial.current) streakMaterial.current.opacity = flash.current * 0.8;
    if (muzzleLight.current) muzzleLight.current.intensity = flash.current * 8;
    if (!mesh.current) return;
    const reloadPose = reloadPoseAt(
      weaponStateRef.current.isReloading
        ? performance.now() / 1000 - reloadStartedAtRef.current
        : RELOAD_SECONDS,
      reloadPoseRef.current,
    );
    mesh.current.position.copy(camera.position);
    mesh.current.quaternion.copy(camera.quaternion);
    mesh.current.rotateX(-0.08 + reloadPose.rotationX);
    mesh.current.rotateZ(reloadPose.rotationZ);
    mesh.current.translateX(reloadPose.positionX);
    mesh.current.translateY(-0.52 + reloadPose.positionY + recoil.current * 0.06);
    mesh.current.translateZ(-1.15 + reloadPose.positionZ + recoil.current * 0.16);
  });

  return (
    <group ref={mesh} scale={0.68}>
      <pointLight
        ref={muzzleLight}
        position={[0, 0.16, -2.02]}
        intensity={0}
        distance={4}
        color="#ff9d45"
      />
      <mesh position={[0, -0.05, 0.06]} castShadow>
        <boxGeometry args={[0.72, 0.38, 0.7]} />
        <meshStandardMaterial
          color="#302724"
          emissive="#140b08"
          emissiveIntensity={0.22}
          metalness={0.56}
          roughness={0.4}
        />
      </mesh>
      <mesh position={[0, 0.08, -0.56]} castShadow>
        <boxGeometry args={[0.54, 0.25, 0.82]} />
        <meshStandardMaterial
          color="#242024"
          emissive="#10080a"
          emissiveIntensity={0.18}
          metalness={0.82}
          roughness={0.27}
        />
      </mesh>
      <mesh position={[0, 0.02, -1.04]}>
        <boxGeometry args={[0.59, 0.3, 0.46]} />
        <meshStandardMaterial
          color="#714028"
          emissive="#210c06"
          emissiveIntensity={0.3}
          roughness={0.74}
        />
      </mesh>
      <mesh position={[-0.16, 0.13, -1.42]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.095, 0.105, 1.12, 10]} />
        <meshStandardMaterial
          color="#1d1c1e"
          emissive="#090709"
          emissiveIntensity={0.16}
          metalness={0.88}
          roughness={0.23}
        />
      </mesh>
      <mesh position={[0.16, 0.13, -1.42]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.095, 0.105, 1.12, 10]} />
        <meshStandardMaterial
          color="#1d1c1e"
          emissive="#090709"
          emissiveIntensity={0.16}
          metalness={0.88}
          roughness={0.23}
        />
      </mesh>
      <mesh position={[0, 0.16, -1.9]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.115, 0.115, 0.16, 10]} />
        <meshStandardMaterial color="#171417" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0, -0.3, 0.39]} rotation={[0.3, 0, 0]} castShadow>
        <boxGeometry args={[0.46, 0.38, 0.7]} />
        <meshStandardMaterial
          color="#713d26"
          emissive="#220e07"
          emissiveIntensity={0.28}
          roughness={0.78}
        />
      </mesh>
      <mesh position={[0, -0.38, -0.14]} rotation={[0.42, 0, 0]}>
        <boxGeometry args={[0.24, 0.46, 0.36]} />
        <meshStandardMaterial
          color="#392019"
          emissive="#150705"
          emissiveIntensity={0.22}
          roughness={0.92}
        />
      </mesh>
      <group ref={muzzleFlash} position={[0, 0.16, -2.02]} visible={false} raycast={() => null}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.26, 0.62, 6]} />
          <meshBasicMaterial
            ref={flashMaterial}
            color="#ffe1a0"
            transparent
            depthWrite={false}
          />
        </mesh>
        {[
          [-0.13, 0.05, -0.56, -0.08, 0.12],
          [0.14, -0.03, -0.68, 0.06, -0.1],
          [0.03, 0.13, -0.5, 0.13, 0.03],
        ].map(([x, y, z, rotationX, rotationY]) => (
          <mesh key={`${x}-${y}`} position={[x, y, z]} rotation={[rotationX, rotationY, 0]}>
            <boxGeometry args={[0.025, 0.025, 0.9]} />
            <meshBasicMaterial
              ref={streakMaterial}
              color="#ffbc63"
              transparent
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function FireInput({ active, fire }: { active: boolean; fire: () => boolean }) {
  const { gl } = useThree();
  const activeRef = useRef(active);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const canvas = gl.domElement;
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || !activeRef.current || document.pointerLockElement !== canvas)
        return;
      fire();
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [fire, gl]);

  return null;
}

function ReloadInput({ active, reload }: { active: boolean; reload: () => boolean }) {
  const { gl } = useThree();
  const activeRef = useRef(active);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        !isReloadInput(event.code, event.repeat) ||
        !activeRef.current ||
        document.pointerLockElement !== gl.domElement
      )
        return;
      if (reload()) event.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [gl, reload]);

  return null;
}

export function CombatScene({
  active,
  onEncounterStateChange,
  onEmptyFire,
  onWeaponStateChange,
}: {
  active: boolean;
  onEncounterStateChange: (state: EncounterState) => void;
  onEmptyFire: () => void;
  onWeaponStateChange: (state: WeaponState) => void;
}) {
  const { camera, scene } = useThree();
  const shotIdRef = useRef(0);
  const lastShotAt = useRef(-Infinity);
  const weaponStateRef = useRef<WeaponState>(INITIAL_WEAPON_STATE);
  const reloadStartedAtRef = useRef(-Infinity);
  const [weaponAudio] = useState(() => new WeaponAudio());
  const [impactState, setImpactState] = useState(createArenaImpactState);
  const impactStateRef = useRef(impactState);
  const encounterStateRef = useRef(createEncounterState());
  const trainingTargetHealthRef = useRef(createTrainingTargetHealth());

  const updateWeaponState = useCallback(
    (state: WeaponState) => {
      weaponStateRef.current = state;
      onWeaponStateChange(state);
    },
    [onWeaponStateChange],
  );

  useEffect(() => {
    onWeaponStateChange(weaponStateRef.current);
  }, [onWeaponStateChange]);

  useEffect(() => () => weaponAudio.stop(), [weaponAudio]);

  const hitLight = useCallback((lightId: string, distance: number) => {
    const impact = hitBreakableLight(impactStateRef.current, lightId, distance);
    if (impact.state !== impactStateRef.current) {
      impactStateRef.current = impact.state;
      setImpactState(impact.state);
    }
    return impact.sound;
  }, []);

  const updateEncounterState = useCallback(
    (nextState: EncounterState) => {
      const previousState = encounterStateRef.current;
      encounterStateRef.current = nextState;
      if (hasEncounterPresentationChanged(previousState, nextState)) {
        onEncounterStateChange(nextState);
      }
    },
    [onEncounterStateChange],
  );

  const updateTargetHealth = useCallback(
    (targetId: string, health: number) => {
      trainingTargetHealthRef.current = {
        ...trainingTargetHealthRef.current,
        [targetId]: health,
      };
      updateEncounterState(
        startEncounterCountdown(encounterStateRef.current, trainingTargetHealthRef.current),
      );
    },
    [updateEncounterState],
  );

  useFrame((_, delta) => {
    if (
      weaponStateRef.current.isReloading &&
      performance.now() / 1000 - reloadStartedAtRef.current >= RELOAD_SECONDS
    ) {
      updateWeaponState(completeReload(weaponStateRef.current));
    }
    if (active) {
      updateEncounterState(advanceEncounterCountdown(encounterStateRef.current, delta));
    }
  });

  const fire = useCallback(() => {
    const now = performance.now() / 1000;
    if (!canFireWeapon(weaponStateRef.current, lastShotAt.current, now)) {
      if (weaponStateRef.current.ammunition === 0 && !weaponStateRef.current.isReloading) {
        weaponAudio.playEmptyFire();
        onEmptyFire();
      }
      return false;
    }
    lastShotAt.current = now;
    updateWeaponState(consumeRound(weaponStateRef.current));
    camera.getWorldDirection(cameraDirection);
    cameraRight.crossVectors(cameraDirection, camera.up).normalize();
    cameraUp.crossVectors(cameraRight, cameraDirection).normalize();
    let impact: { sound: ImpactSound; distance: number } | null = null;
    for (const [horizontal, vertical] of pelletOffsets()) {
      pelletDirection
        .copy(cameraDirection)
        .addScaledVector(cameraRight, horizontal)
        .addScaledVector(cameraUp, vertical)
        .normalize();
      raycaster.set(camera.position, pelletDirection);
      const collisions = raycaster
        .intersectObjects(scene.children, true)
        .map(({ object, point }) => {
          const handler = shotImpactHandler(object);
          return {
            target: handler
              ? { distance: camera.position.distanceTo(point), handler, point }
              : null,
          };
        });
      const collision = firstShotTarget(collisions);
      if (!collision) continue;
      const sound = collision.handler({ distance: collision.distance, point: collision.point });
      if (!sound) continue;
      const selectedSound = selectImpactSound(impact?.sound ?? null, sound);
      if (!impact || selectedSound !== impact.sound) {
        impact = { sound: selectedSound, distance: collision.distance };
      }
    }
    shotIdRef.current += 1;
    weaponAudio.playShotgunBlast();
    if (impact) weaponAudio.playImpact(impact.sound, impact.distance);
    return true;
  }, [camera, onEmptyFire, scene, updateWeaponState, weaponAudio]);

  const reload = useCallback(() => {
    const nextState = startReload(weaponStateRef.current);
    if (nextState === weaponStateRef.current) return false;
    reloadStartedAtRef.current = performance.now() / 1000;
    updateWeaponState(nextState);
    weaponAudio.playReload();
    return true;
  }, [updateWeaponState, weaponAudio]);

  return (
    <>
      <BreakableLights brokenLightIds={impactState.brokenLightIds} onLightHit={hitLight} />
      <TargetVisuals onHealthChange={updateTargetHealth} />
      <Shotgun
        shotIdRef={shotIdRef}
        weaponStateRef={weaponStateRef}
        reloadStartedAtRef={reloadStartedAtRef}
      />
      <FireInput active={active} fire={fire} />
      <ReloadInput active={active} reload={reload} />
    </>
  );
}
