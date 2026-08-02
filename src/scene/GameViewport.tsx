import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Physics, useRapier } from '@react-three/rapier';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { ACESFilmicToneMapping, SRGBColorSpace, Vector3 } from 'three';
import { ARENA_RENDER_CONFIG } from '../game/arena';
import {
  areAllTrainingZombiesRemoved,
  completeEncounter,
  createEncounterState,
  recordTrainingZombieRemoval,
  trainingTargetsHaveCollision,
  type EncounterState,
} from '../game/encounter';
import type { TouchInputState } from '../game/input';
import type { PlayerLifeState } from '../game/playerHealth';
import type { WeaponState } from '../game/shooting';
import type { TrainingZombieId } from '../game/zombie';
import { ArenaColliders, ArenaVisuals } from './Arena';
import { CombatScene, TargetColliders } from './CombatScene';
import { Player } from './Player';
import { canvasDprForTouchControls } from './renderQuality';
import { DEVELOPMENT_DIAGNOSTICS, reportRuntimeDiagnostics } from './runtimeDiagnostics';
import { TrainingZombieEncounter } from './TrainingZombieEncounter';
import { ZombieAssetWarmup } from './Zombie';
import { preloadZombieAssets } from './zombieAssets';

type GameViewportProps = {
  active: boolean;
  invertY: boolean;
  playerLifeState: PlayerLifeState;
  runId: number;
  onCanvasReady: (canvas: HTMLCanvasElement | null) => void;
  onEncounterStateChange: (state: EncounterState) => void;
  onEmptyFire: () => void;
  onPlayerDamage: (damage: number) => void;
  onWeaponStateChange: (state: WeaponState) => void;
  touchInput: TouchInputState;
  touchControls: boolean;
};

const diagnosticCameraForward = new Vector3();

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
    camera.getWorldDirection(diagnosticCameraForward);
    reportRuntimeDiagnostics({
      camera: [camera.position.x, camera.position.y, camera.position.z],
      cameraRotation: [camera.rotation.x, camera.rotation.y, camera.rotation.z],
      cameraForward: [
        diagnosticCameraForward.x,
        diagnosticCameraForward.y,
        diagnosticCameraForward.z,
      ],
      canvas: [size.width, size.height],
      drawCalls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      geometries: gl.info.memory.geometries,
      textures: gl.info.memory.textures,
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
  const { world } = useRapier();
  const lastSample = useRef(0);

  useEffect(() => {
    reportRuntimeDiagnostics({ physics: 'ready' });
  }, []);

  useFrame(({ clock }) => {
    if (
      !DEVELOPMENT_DIAGNOSTICS.enabled ||
      clock.elapsedTime - lastSample.current < DEVELOPMENT_DIAGNOSTICS.sampleIntervalSeconds
    )
      return;
    lastSample.current = clock.elapsedTime;
    let rigidBodies = 0;
    let colliders = 0;
    world.forEachRigidBody(() => {
      rigidBodies += 1;
    });
    world.forEachCollider(() => {
      colliders += 1;
    });
    reportRuntimeDiagnostics({ rigidBodies, colliders });
  });

  return null;
}

function RunScene({
  active,
  invertY,
  playerLifeState,
  onEncounterStateChange,
  onEmptyFire,
  onPlayerDamage,
  onWeaponStateChange,
  touchInput,
}: Pick<
  GameViewportProps,
  | 'active'
  | 'invertY'
  | 'playerLifeState'
  | 'onEncounterStateChange'
  | 'onEmptyFire'
  | 'onPlayerDamage'
  | 'onWeaponStateChange'
  | 'touchInput'
>) {
  const [encounterState, setEncounterState] = useState(createEncounterState);
  const removedZombieIdsRef = useRef<ReadonlySet<TrainingZombieId>>(new Set());
  const updateEncounterState = useCallback(
    (state: EncounterState) => {
      setEncounterState(state);
      onEncounterStateChange(state);
    },
    [onEncounterStateChange],
  );
  const removeTrainingZombie = useCallback(
    (zombieId: TrainingZombieId) => {
      removedZombieIdsRef.current = recordTrainingZombieRemoval(
        removedZombieIdsRef.current,
        zombieId,
      );
      if (areAllTrainingZombiesRemoved(removedZombieIdsRef.current)) {
        updateEncounterState(completeEncounter({ phase: 'zombie' }));
      }
    },
    [updateEncounterState],
  );

  return (
    <>
      <CombatScene
        active={active}
        playerLifeState={playerLifeState}
        onEncounterStateChange={updateEncounterState}
        onEmptyFire={onEmptyFire}
        onWeaponStateChange={onWeaponStateChange}
        touchInput={touchInput}
      />
      {active && (
        <Suspense fallback={null}>
          <ZombieAssetWarmup />
        </Suspense>
      )}
      <Suspense fallback={null}>
        <Physics gravity={[0, -20, 0]} maxCcdSubsteps={2} paused={!active} timeStep={1 / 60}>
          <PhysicsDiagnostics />
          <ArenaColliders />
          {trainingTargetsHaveCollision(encounterState) && <TargetColliders />}
          <Player
            active={active}
            invertY={invertY}
            lifeState={playerLifeState}
            touchInput={touchInput}
          />
          {encounterState.phase === 'zombie' && (
            <Suspense fallback={null}>
              <TrainingZombieEncounter
                active={active}
                playerAlive={playerLifeState === 'alive'}
                onPlayerDamage={onPlayerDamage}
                onZombieRemoved={removeTrainingZombie}
              />
            </Suspense>
          )}
        </Physics>
      </Suspense>
    </>
  );
}

export function GameViewport({
  active,
  invertY,
  playerLifeState,
  runId,
  onCanvasReady,
  onEncounterStateChange,
  onEmptyFire,
  onPlayerDamage,
  onWeaponStateChange,
  touchInput,
  touchControls,
}: GameViewportProps) {
  useEffect(() => {
    preloadZombieAssets();
  }, []);

  return (
    <Canvas
      aria-label="Boomstick arena. Use Enter Arena to enable mouse look."
      className="game-viewport"
      camera={{ fov: 76, near: 0.1, far: 120, position: [0, 2.1, 12] }}
      dpr={canvasDprForTouchControls(touchControls)}
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
        gl.toneMappingExposure = ARENA_RENDER_CONFIG.toneMappingExposure;
        gl.setClearColor('#130e0e', 1);
      }}
    >
      <CanvasRegistration onCanvasReady={onCanvasReady} />
      <RenderDiagnostics />
      <ArenaVisuals />
      <RunScene
        key={runId}
        active={active}
        invertY={invertY}
        playerLifeState={playerLifeState}
        onEncounterStateChange={onEncounterStateChange}
        onEmptyFire={onEmptyFire}
        onPlayerDamage={onPlayerDamage}
        onWeaponStateChange={onWeaponStateChange}
        touchInput={touchInput}
      />
    </Canvas>
  );
}
