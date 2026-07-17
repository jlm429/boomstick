import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useRef, type MutableRefObject } from 'react';
import { Group, MeshStandardMaterial, Object3D, Raycaster, Vector3 } from 'three';
import { canFireShot, firstShotTarget, pelletOffsets } from '../game/shooting';
import { ARENA_TARGETS, type TargetDefinition } from '../game/targets';

const cameraDirection = new Vector3();
const cameraRight = new Vector3();
const cameraUp = new Vector3();
const pelletDirection = new Vector3();
const raycaster = new Raycaster();
const HIT_FLASH_SECONDS = 0.18;

type TargetHitHandler = () => void;

function targetHitHandler(object: Object3D): TargetHitHandler | null {
  let current: Object3D | null = object;
  while (current) {
    const onHit = current.userData.onHit as TargetHitHandler | undefined;
    if (onHit) return onHit;
    current = current.parent;
  }
  return null;
}

function TargetVisual({ target }: { target: TargetDefinition }) {
  const materialRef = useRef<MeshStandardMaterial>(null);
  const hitAtRef = useRef<number | null>(null);
  useFrame(() => {
    const elapsed =
      hitAtRef.current === null ? Infinity : performance.now() / 1000 - hitAtRef.current;
    const strength = Math.max(0, 1 - elapsed / HIT_FLASH_SECONDS);
    if (materialRef.current) materialRef.current.emissiveIntensity = 0.25 + strength * 2.5;
  });

  const onHit: TargetHitHandler = () => {
    hitAtRef.current = performance.now() / 1000;
  };

  return (
    <group position={[...target.position]} userData={{ onHit }}>
      <mesh castShadow receiveShadow>
        <boxGeometry
          args={target.halfExtents.map((value) => value * 2) as [number, number, number]}
        />
        <meshStandardMaterial
          ref={materialRef}
          color="#d9e2d5"
          emissive="#ff5c35"
          emissiveIntensity={0.25}
        />
      </mesh>
      <mesh position={[0, 0, target.halfExtents[2] + 0.012]}>
        <circleGeometry args={[0.48, 24]} />
        <meshBasicMaterial color="#18252d" />
      </mesh>
      <mesh position={[0, 0, target.halfExtents[2] + 0.02]}>
        <circleGeometry args={[0.23, 24]} />
        <meshBasicMaterial color="#ffbb45" />
      </mesh>
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

function TargetVisuals() {
  return (
    <>
      {ARENA_TARGETS.map((target) => (
        <TargetVisual key={target.id} target={target} />
      ))}
    </>
  );
}

function Shotgun({ shotIdRef }: { shotIdRef: MutableRefObject<number> }) {
  const mesh = useRef<Group>(null);
  const { camera } = useThree();
  const recoil = useRef(0);
  const renderedShotId = useRef(0);

  useFrame((_, delta) => {
    if (renderedShotId.current !== shotIdRef.current) {
      renderedShotId.current = shotIdRef.current;
      recoil.current = 1;
    }
    recoil.current = Math.max(0, recoil.current - delta * 6);
    if (!mesh.current) return;
    mesh.current.position.copy(camera.position);
    mesh.current.quaternion.copy(camera.quaternion);
    mesh.current.rotateX(-0.08);
    mesh.current.translateY(-0.52 + recoil.current * 0.06);
    mesh.current.translateZ(-1.15 + recoil.current * 0.16);
  });

  return (
    <group ref={mesh} scale={0.68}>
      <pointLight position={[0, 0, -0.6]} intensity={1.2} distance={3} color="#d26a35" />
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

export function CombatScene({ active }: { active: boolean }) {
  const { camera, scene } = useThree();
  const shotIdRef = useRef(0);
  const lastShotAt = useRef(-Infinity);

  const fire = useCallback(() => {
    const now = performance.now() / 1000;
    if (!canFireShot(lastShotAt.current, now)) return false;
    lastShotAt.current = now;
    camera.getWorldDirection(cameraDirection);
    cameraRight.crossVectors(cameraDirection, camera.up).normalize();
    cameraUp.crossVectors(cameraRight, cameraDirection).normalize();
    for (const [horizontal, vertical] of pelletOffsets()) {
      pelletDirection
        .copy(cameraDirection)
        .addScaledVector(cameraRight, horizontal)
        .addScaledVector(cameraUp, vertical)
        .normalize();
      raycaster.set(camera.position, pelletDirection);
      const collisions = raycaster
        .intersectObjects(scene.children, true)
        .map(({ object }) => ({ target: targetHitHandler(object) }));
      firstShotTarget(collisions)?.();
    }
    shotIdRef.current += 1;
    return true;
  }, [camera, scene]);

  return (
    <>
      <TargetVisuals />
      <Shotgun shotIdRef={shotIdRef} />
      <FireInput active={active} fire={fire} />
    </>
  );
}
