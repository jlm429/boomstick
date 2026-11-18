import { useEffect, useMemo } from 'react';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import {
  ARENA_BLOCKS,
  ARENA_LIGHT_FIXTURES,
  ARENA_RENDER_CONFIG,
  type ArenaBlock,
  type ArenaLightFixture,
} from '../game/arena';
import type { ImpactSound, ShotImpactHandler } from '../game/impacts';
import { SurfaceFinish } from './SurfaceFinish';
import { industrialBlockGeometry } from './industrialGeometry';
import { ArenaSky } from './ArenaSky';

const onSurfaceImpact: ShotImpactHandler = () => 'wall';
const WALL_TEXTURE_REPEAT = [12, 2] as const;

function ArenaMesh({ block }: { block: ArenaBlock }) {
  const { position, halfExtents, color } = block;
  const floor = block.id === 'floor';
  const industrial = /cover|pillar|landmark/.test(block.id);
  const geometry = useMemo(
    () =>
      industrial
        ? industrialBlockGeometry(
            halfExtents.map((value) => value * 2) as [number, number, number],
            block.id.includes('landmark'),
          )
        : null,
    [block.id, halfExtents, industrial],
  );
  useEffect(() => () => geometry?.dispose(), [geometry]);
  return (
    <group position={[...position]} userData={{ onShotImpact: onSurfaceImpact }}>
      <mesh castShadow={!industrial && !floor} receiveShadow>
        <boxGeometry args={halfExtents.map((value) => value * 2) as [number, number, number]} />
        {industrial ? (
          <meshBasicMaterial visible={false} />
        ) : (
          <meshStandardMaterial color={color} roughness={1} bumpScale={floor ? 0.075 : 0.045}>
            {floor ? (
              <SurfaceFinish variant="gravel" repeat={7} tint />
            ) : (
              <SurfaceFinish repeat={WALL_TEXTURE_REPEAT} tint />
            )}
          </meshStandardMaterial>
        )}
      </mesh>
      {geometry && (
        <mesh geometry={geometry} castShadow receiveShadow raycast={() => null}>
          <meshStandardMaterial vertexColors roughness={0.91} metalness={0.1} bumpScale={0.04}>
            <SurfaceFinish variant="metal" repeat={2} tint />
          </meshStandardMaterial>
        </mesh>
      )}
    </group>
  );
}

function FixtureLight({ fixture }: { fixture: ArenaLightFixture }) {
  if (fixture.kind === 'wall' || fixture.kind === 'landmark') {
    const isLandmark = fixture.kind === 'landmark';
    return (
      <pointLight
        position={[0, 0.15, 0.28]}
        intensity={isLandmark ? 8 : 3}
        distance={isLandmark ? 13 : 7}
        color="#ffd3a2"
      />
    );
  }

  const isCover = fixture.kind === 'cover';
  return (
    <pointLight
      position={[0, 0.3, 0]}
      intensity={isCover ? 2 : 3}
      distance={isCover ? 9.5 : 10.5}
      color="#ffd3a2"
    />
  );
}

function BreakableLight({
  broken,
  fixture,
  onHit,
}: {
  broken: boolean;
  fixture: ArenaLightFixture;
  onHit: ShotImpactHandler;
}) {
  const wallMounted = fixture.kind === 'wall' || fixture.kind === 'landmark';
  const bulbPosition: [number, number, number] = wallMounted ? [0, 0.15, 0.16] : [0, 0.17, 0];
  const hitVolumePosition: [number, number, number] = wallMounted
    ? [0, 0.15, 0.24]
    : [0, 0.23, 0];

  return (
    <group
      position={[...fixture.position]}
      rotation={[0, fixture.rotationY ?? 0, 0]}
      userData={{ onShotImpact: onHit }}
    >
      {wallMounted ? (
        <mesh castShadow>
          <boxGeometry args={[0.34, 0.7, 0.18]} />
          <meshStandardMaterial color="#211614" metalness={0.54} roughness={0.48} />
        </mesh>
      ) : (
        <mesh position={[0, 0.06, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.24, 0.12, 10]} />
          <meshStandardMaterial color="#211614" metalness={0.48} roughness={0.52} />
        </mesh>
      )}
      <mesh
        position={bulbPosition}
        scale={broken ? [1, 0.42, 1] : 1}
        rotation={broken ? [0.35, 0, 0.22] : undefined}
      >
        <sphereGeometry args={[wallMounted ? 0.13 : 0.12, 10, 8]} />
        <meshStandardMaterial
          color={broken ? '#332e27' : '#d7b681'}
          emissive={broken ? '#000000' : '#c17e3e'}
          emissiveIntensity={broken ? 0 : 0.7}
          roughness={broken ? 0.88 : 0.56}
        />
      </mesh>
      <mesh position={hitVolumePosition}>
        <boxGeometry args={wallMounted ? [0.74, 0.94, 0.46] : [0.72, 0.48, 0.72]} />
        <meshBasicMaterial colorWrite={false} depthWrite={false} />
      </mesh>
      {!broken && fixture.contributesLight && <FixtureLight fixture={fixture} />}
    </group>
  );
}

export function BreakableLights({
  brokenLightIds,
  onLightHit,
}: {
  brokenLightIds: ReadonlySet<string>;
  onLightHit: (lightId: string, distance: number) => ImpactSound;
}) {
  return (
    <>
      {ARENA_LIGHT_FIXTURES.map((fixture) => (
        <BreakableLight
          key={fixture.id}
          broken={brokenLightIds.has(fixture.id)}
          fixture={fixture}
          onHit={({ distance }) => onLightHit(fixture.id, distance)}
        />
      ))}
    </>
  );
}

function ArenaDressings() {
  return (
    <>
      {[-2.8, 2.8].map((x) => (
        <mesh key={x} position={[x, 0.28, -10]} raycast={() => null} receiveShadow>
          <boxGeometry args={[1.18, 0.22, 2.02]} />
          <meshStandardMaterial color="#211614" metalness={0.38} roughness={0.62} />
        </mesh>
      ))}
    </>
  );
}

export function ArenaVisuals() {
  return (
    <>
      <color attach="background" args={[ARENA_RENDER_CONFIG.background]} />
      <fog attach="fog" args={[ARENA_RENDER_CONFIG.background, 24, 65]} />
      <ArenaSky />
      <ambientLight {...ARENA_RENDER_CONFIG.ambientLight} />
      <hemisphereLight intensity={1.7} color="#d5e4ee" groundColor="#777162" />
      <directionalLight
        position={[-12, 16, 9]}
        intensity={2.1}
        color="#fff0d6"
        castShadow
        shadow-mapSize={[512, 512]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
        shadow-camera-left={-26}
        shadow-camera-right={26}
        shadow-camera-top={26}
        shadow-camera-bottom={-26}
      />
      {ARENA_BLOCKS.map((block) => (
        <ArenaMesh key={block.id} block={block} />
      ))}
      <ArenaDressings />
    </>
  );
}

export function ArenaColliders() {
  return (
    <>
      {ARENA_BLOCKS.map(({ id, position, halfExtents }) => (
        <RigidBody key={id} type="fixed" colliders={false}>
          <CuboidCollider position={[...position]} args={[...halfExtents]} />
        </RigidBody>
      ))}
    </>
  );
}
