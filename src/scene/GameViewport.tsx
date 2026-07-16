import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Suspense } from 'react';
import { Arena } from './Arena';
import { Player } from './Player';

export function GameViewport({ active, runId }: { active: boolean; runId: number }) {
  return (
    <Canvas
      aria-label="Boomstick arena. Click to enter mouse look."
      camera={{ fov: 78, near: 0.1, far: 100, position: [0, 2.2, 8] }}
      dpr={[1, 1.75]}
      shadows
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onPointerDown={(event) => {
        if (active) void event.currentTarget.requestPointerLock().catch(() => undefined);
      }}
    >
      <Suspense fallback={null}>
        <Physics gravity={[0, -20, 0]} paused={!active}>
          <Arena />
          <Player key={runId} active={active} />
        </Physics>
      </Suspense>
    </Canvas>
  );
}
