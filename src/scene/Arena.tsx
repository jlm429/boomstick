import { Float, Text } from '@react-three/drei';
import { CuboidCollider, RigidBody } from '@react-three/rapier';

function Structure({
  position,
  args,
  color = '#263d52',
}: {
  position: [number, number, number];
  args: [number, number, number];
  color?: string;
}) {
  return (
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider position={position} args={args} />
      <mesh position={position} castShadow receiveShadow>
        <boxGeometry args={args.map((value) => value * 2) as [number, number, number]} />
        <meshStandardMaterial color={color} roughness={0.72} metalness={0.3} />
      </mesh>
    </RigidBody>
  );
}

export function Arena() {
  return (
    <>
      <color attach="background" args={['#0c1927']} />
      <fog attach="fog" args={['#0c1927', 18, 48]} />
      <ambientLight intensity={0.72} color="#9abfe8" />
      <hemisphereLight intensity={0.85} color="#b6dcff" groundColor="#142031" />
      <directionalLight
        position={[7, 13, 4]}
        intensity={2.3}
        color="#dcecff"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[0, 5, 0]} intensity={28} distance={18} color="#25d8ff" />
      <pointLight position={[-10, 3, -8]} intensity={16} distance={15} color="#ff7e55" />
      <pointLight position={[11, 4, 8]} intensity={13} distance={14} color="#7867ff" />
      <Structure position={[0, -0.5, 0]} args={[18, 0.5, 18]} color="#1b2d40" />
      <Structure position={[0, 8, 0]} args={[18, 0.25, 18]} color="#17283a" />
      <Structure position={[0, 3.5, -18]} args={[18, 4, 0.5]} />
      <Structure position={[0, 3.5, 18]} args={[18, 4, 0.5]} />
      <Structure position={[-18, 3.5, 0]} args={[0.5, 4, 18]} />
      <Structure position={[18, 3.5, 0]} args={[0.5, 4, 18]} />
      <Structure position={[-7, 1.15, -5]} args={[3.4, 1.15, 2.3]} color="#365873" />
      <Structure position={[8, 0.7, 3]} args={[2.6, 0.7, 2.6]} color="#365873" />
      <Structure position={[-11, 1.6, 8]} args={[1.8, 1.6, 4]} color="#2c4960" />
      <Structure position={[11, 1.9, -9]} args={[1.7, 1.9, 3.2]} color="#2c4960" />
      {[
        [-14, 0.08, -13],
        [14, 0.08, -13],
        [-14, 0.08, 13],
        [14, 0.08, 13],
      ].map((position) => (
        <mesh
          key={position.join('-')}
          position={position as [number, number, number]}
          receiveShadow
        >
          <cylinderGeometry args={[0.9, 1.2, 0.16, 8]} />
          <meshStandardMaterial color="#20d2eb" emissive="#0e5f75" emissiveIntensity={2} />
        </mesh>
      ))}
      <Float speed={1.6} rotationIntensity={0.15} floatIntensity={0.3}>
        <Text
          position={[0, 5.4, -17.3]}
          fontSize={1.25}
          letterSpacing={0.18}
          color="#b6f5ff"
          anchorX="center"
        >
          BOOMSTICK
        </Text>
      </Float>
    </>
  );
}
