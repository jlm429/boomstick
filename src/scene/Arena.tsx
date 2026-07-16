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

export function ArenaVisuals() {
  return (
    <>
      <color attach="background" args={[ARENA_RENDER_CONFIG.background]} />
      <ambientLight intensity={1.15} color="#dff7ff" />
      <hemisphereLight intensity={1.45} color="#f4fcff" groundColor="#36504a" />
      <directionalLight
        position={[10, 15, 8]}
        intensity={2.6}
        color="#fff1cf"
        castShadow
        shadow-mapSize={[512, 512]}
        shadow-camera-left={-26}
        shadow-camera-right={26}
        shadow-camera-top={26}
        shadow-camera-bottom={-26}
      />
      <pointLight position={[0, 5, -8]} intensity={22} distance={20} color="#ffb15c" />
      <pointLight position={[0, 4, 12]} intensity={14} distance={18} color="#68e5ff" />
      {ARENA_BLOCKS.map((block) => (
        <ArenaMesh key={block.id} block={block} />
      ))}
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
