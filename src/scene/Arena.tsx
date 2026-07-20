import { CuboidCollider, RigidBody } from '@react-three/rapier';
import {
  ARENA_BLOCKS,
  ARENA_LIGHT_FIXTURES,
  ARENA_RENDER_CONFIG,
  type ArenaBlock,
  type ArenaLightFixture,
} from '../game/arena';
import type { ImpactSound, ShotImpactHandler } from '../game/impacts';

const onSurfaceImpact: ShotImpactHandler = () => 'wall';

function ArenaMesh({ block }: { block: ArenaBlock }) {
  const { position, halfExtents, color, emissive = '#000000' } = block;
  return (
    <mesh
      position={[...position]}
      castShadow={block.id !== 'floor'}
      receiveShadow
      userData={{ onShotImpact: onSurfaceImpact }}
    >
      <boxGeometry args={halfExtents.map((value) => value * 2) as [number, number, number]} />
      <meshStandardMaterial
        color={color}
        emissive={emissive}
        emissiveIntensity={emissive === '#000000' ? 0 : 0.45}
        roughness={0.78}
        metalness={0.08}
      />
    </mesh>
  );
}

function FixtureLight({ fixture }: { fixture: ArenaLightFixture }) {
  if (fixture.kind === 'wall' || fixture.kind === 'landmark') {
    const isLandmark = fixture.kind === 'landmark';
    return (
      <pointLight
        position={[0, 0.15, 0.28]}
        intensity={isLandmark ? 30 : 8.5}
        distance={isLandmark ? 22 : 12}
        color="#e75a24"
      />
    );
  }

  const isCover = fixture.kind === 'cover';
  return (
    <pointLight
      position={[0, 0.3, 0]}
      intensity={isCover ? 6 : 7}
      distance={isCover ? 9.5 : 10.5}
      color="#df5724"
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
          color={broken ? '#261714' : '#f07a2c'}
          emissive={broken ? '#000000' : '#c13f10'}
          emissiveIntensity={broken ? 0 : wallMounted ? 1.8 : 1.65}
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
          onHit={(distance) => onLightHit(fixture.id, distance)}
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
      <fog attach="fog" args={[ARENA_RENDER_CONFIG.background, 15, 48]} />
      <ambientLight {...ARENA_RENDER_CONFIG.ambientLight} />
      <hemisphereLight intensity={0.88} color="#81483b" groundColor="#170e0b" />
      <directionalLight
        position={[7, 13, 6]}
        intensity={2.4}
        color="#ffb36c"
        castShadow
        shadow-mapSize={[512, 512]}
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
