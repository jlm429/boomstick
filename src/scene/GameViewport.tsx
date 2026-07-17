import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Suspense, useEffect, useRef } from 'react';
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three';
import { ArenaColliders, ArenaVisuals } from './Arena';
import { CombatScene, TargetColliders } from './CombatScene';
import { Player } from './Player';
import { DEVELOPMENT_DIAGNOSTICS, reportRuntimeDiagnostics } from './runtimeDiagnostics';

type GameViewportProps = {
  active: boolean;
  runId: number;
  onCanvasReady: (canvas: HTMLCanvasElement | null) => void;
};

function CanvasRegistration({ onCanvasReady }: Pick<GameViewportProps, 'onCanvasReady'>) {
  const { gl } = useThree();

  useEffect(() => {
    onCanvasReady(gl.domElement);
    return () => onCanvasReady(null);
  }, [gl, onCanvasReady]);

  return null;
}

function RenderDiagnostics() {
  const { camera, gl, scene, size } = useThree();
  const frameCount = useRef(0);
  const lastSample = useRef(0);

  useEffect(() => {
    const canvas = gl.domElement;
    const handleContextLost = () => reportRuntimeDiagnostics({ webglContext: 'lost' });
    const handleContextRestored = () => reportRuntimeDiagnostics({ webglContext: 'ok' });
    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);
    reportRuntimeDiagnostics({
      webglContext: gl.getContext().isContextLost() ? 'lost' : 'ok',
    });
    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
    };
  }, [gl]);

  useEffect(() => {
    reportRuntimeDiagnostics({ canvas: [size.width, size.height] });
  }, [size.height, size.width]);

  useFrame(({ clock }, delta) => {
    if (!DEVELOPMENT_DIAGNOSTICS.enabled) return;
    frameCount.current += 1;
    if (clock.elapsedTime - lastSample.current < DEVELOPMENT_DIAGNOSTICS.sampleIntervalSeconds)
      return;
    lastSample.current = clock.elapsedTime;
    reportRuntimeDiagnostics({
      camera: [camera.position.x, camera.position.y, camera.position.z],
      cameraRotation: [camera.rotation.x, camera.rotation.y, camera.rotation.z],
      canvas: [size.width, size.height],
      drawCalls: gl.info.render.calls,
      frame: frameCount.current,
      frameDelta: delta,
      sceneChildren: scene.children.length,
      webglContext: gl.getContext().isContextLost() ? 'lost' : 'ok',
    });
  });

  return DEVELOPMENT_DIAGNOSTICS.showSceneHelpers ? (
    <gridHelper args={[48, 48, '#b6f7ff', '#527e8c']} position={[0, 0.012, 0]} />
  ) : null;
}

function PhysicsDiagnostics() {
  useEffect(() => {
    reportRuntimeDiagnostics({ physics: 'ready' });
  }, []);
  return null;
}

export function GameViewport({ active, runId, onCanvasReady }: GameViewportProps) {
  return (
    <Canvas
      aria-label="Boomstick arena. Use Enter Arena to enable mouse look."
      className="game-viewport"
      camera={{ fov: 76, near: 0.1, far: 120, position: [0, 2.1, 12] }}
      dpr={[1, 1.5]}
      shadows="basic"
      gl={{
        alpha: false,
        antialias: true,
        depth: true,
        powerPreference: 'default',
        stencil: false,
      }}
      onCreated={({ gl }) => {
        gl.autoClear = true;
        gl.outputColorSpace = SRGBColorSpace;
        gl.toneMapping = ACESFilmicToneMapping;
        gl.toneMappingExposure = 0.9;
        gl.setClearColor('#130e0e', 1);
      }}
    >
      <CanvasRegistration onCanvasReady={onCanvasReady} />
      <RenderDiagnostics />
      <ArenaVisuals />
      <CombatScene active={active} />
      <Suspense fallback={null}>
        <Physics gravity={[0, -20, 0]} maxCcdSubsteps={2} paused={!active} timeStep={1 / 60}>
          <PhysicsDiagnostics />
          <ArenaColliders />
          <TargetColliders />
          <Player key={runId} active={active} />
        </Physics>
      </Suspense>
    </Canvas>
  );
}
