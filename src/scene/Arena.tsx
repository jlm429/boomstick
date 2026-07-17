import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { ARENA_BLOCKS, ARENA_RENDER_CONFIG, type ArenaBlock } from '../game/arena';

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

function ArenaDressings() {
  const sconces: readonly [number, number, number][] = [
    [-13.45, 3.1, -8],
    [13.45, 3.1, -8],
    [-13.45, 3.1, 8],
    [13.45, 3.1, 8],
  ];

  return (
    <>
      {sconces.map((position) => (
        <group key={position.join('-')} position={position} raycast={() => null}>
          <mesh castShadow>
            <boxGeometry args={[0.34, 0.7, 0.18]} />
            <meshStandardMaterial color="#211614" metalness={0.54} roughness={0.48} />
          </mesh>
          <mesh position={[0, 0.15, 0.16]}>
            <sphereGeometry args={[0.13, 10, 8]} />
            <meshStandardMaterial
              color="#f07a2c"
              emissive="#c13f10"
              emissiveIntensity={1.8}
              roughness={0.55}
            />
          </mesh>
          <pointLight position={[0, 0.15, 0.28]} intensity={3.4} distance={5} color="#e75a24" />
        </group>
      ))}
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
      <pointLight position={[0, 5, -8]} intensity={22} distance={19} color="#e75527" />
      <pointLight position={[0, 3.5, 12]} intensity={8} distance={15} color="#c66f3d" />
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
