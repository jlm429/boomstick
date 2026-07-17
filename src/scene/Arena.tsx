import { CuboidCollider, RigidBody } from '@react-three/rapier';
import {
  ARENA_BLOCKS,
  ARENA_LIGHT_FIXTURES,
  ARENA_RENDER_CONFIG,
  type ArenaBlock,
  type ArenaLightFixture,
} from '../game/arena';

function ArenaMesh({ block }: { block: ArenaBlock }) {
  const { position, halfExtents, color, emissive = '#000000' } = block;
  return (
    <mesh position={[...position]} castShadow={block.id !== 'floor'} receiveShadow>
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

function WallLight({ fixture }: { fixture: ArenaLightFixture }) {
  const isLandmark = fixture.kind === 'landmark';
  return (
    <group
      position={[...fixture.position]}
      rotation={[0, fixture.rotationY ?? 0, 0]}
      raycast={() => null}
    >
      <mesh castShadow raycast={() => null}>
        <boxGeometry args={[0.34, 0.7, 0.18]} />
        <meshStandardMaterial color="#211614" metalness={0.54} roughness={0.48} />
      </mesh>
      <mesh position={[0, 0.15, 0.16]} raycast={() => null}>
        <sphereGeometry args={[0.13, 10, 8]} />
        <meshStandardMaterial
          color="#f07a2c"
          emissive="#c13f10"
          emissiveIntensity={1.8}
          roughness={0.55}
        />
      </mesh>
      <pointLight
        position={[0, 0.15, 0.28]}
        intensity={isLandmark ? 18 : 3.4}
        distance={isLandmark ? 17 : 6}
        color="#e75a24"
      />
    </group>
  );
}

function ObstacleLight({ fixture }: { fixture: ArenaLightFixture }) {
  const isCover = fixture.kind === 'cover';
  return (
    <group position={[...fixture.position]} raycast={() => null}>
      <mesh position={[0, 0.06, 0]} castShadow raycast={() => null}>
        <cylinderGeometry args={[0.2, 0.24, 0.12, 10]} />
        <meshStandardMaterial color="#211614" metalness={0.48} roughness={0.52} />
      </mesh>
      <mesh position={[0, 0.17, 0]} raycast={() => null}>
        <sphereGeometry args={[0.12, 10, 8]} />
        <meshStandardMaterial
          color="#f07a2c"
          emissive="#c13f10"
          emissiveIntensity={1.65}
          roughness={0.58}
        />
      </mesh>
      <pointLight
        position={[0, 0.3, 0]}
        intensity={isCover ? 2.6 : 3.1}
        distance={isCover ? 4.6 : 5.2}
        color="#df5724"
      />
    </group>
  );
}

function ArenaDressings() {
  return (
    <>
      {ARENA_LIGHT_FIXTURES.map((fixture) =>
        fixture.kind === 'wall' || fixture.kind === 'landmark' ? (
          <WallLight key={fixture.id} fixture={fixture} />
        ) : (
          <ObstacleLight key={fixture.id} fixture={fixture} />
        ),
      )}
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
      <ambientLight intensity={0.42} color="#9a6850" />
      <hemisphereLight intensity={0.48} color="#754237" groundColor="#0d0908" />
      <directionalLight
        position={[7, 13, 6]}
        intensity={2.05}
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
