import { useFrame, useThree } from '@react-three/fiber';
import { CapsuleCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import { useEffect, useRef } from 'react';
import { Euler, Vector3 } from 'three';
import { shouldResetPlayerPosition } from '../game/arena';
import {
  CAMERA_EYE_OFFSET,
  JUMP_VELOCITY,
  MAX_FRAME_DELTA,
  MOVE_SPEED,
  PLAYER_SPAWN,
} from '../game/constants';
import {
  clearPressedKeys,
  createPressedKeys,
  isGameControl,
  movementInput,
  mouseLookDelta,
  pressKey,
  releaseKey,
  type PressedKeys,
} from '../game/input';
import { movementVector } from '../game/movement';
import { DEVELOPMENT_DIAGNOSTICS, reportRuntimeDiagnostics } from './runtimeDiagnostics';

const UP = new Vector3(0, 1, 0);
const walkDirection = new Vector3();
const cameraDirection = new Vector3();
const rotation = new Euler(0, 0, 0, 'YXZ');

function resetBody(rigidBody: RapierRigidBody) {
  rigidBody.setTranslation(
    { x: PLAYER_SPAWN[0], y: PLAYER_SPAWN[1], z: PLAYER_SPAWN[2] },
    true,
  );
  rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
  rigidBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
}

export function Player({ active, invertY }: { active: boolean; invertY: boolean }) {
  const body = useRef<RapierRigidBody>(null);
  const activeRef = useRef(active);
  const invertYRef = useRef(invertY);
  const pressed = useRef<PressedKeys>(createPressedKeys());
  const yaw = useRef(0);
  const pitch = useRef(0);
  const lastDiagnosticSample = useRef(0);
  const { camera, gl } = useThree();

  useEffect(() => {
    activeRef.current = active;
    if (!active) clearPressedKeys(pressed.current);
  }, [active]);

  useEffect(() => {
    invertYRef.current = invertY;
  }, [invertY]);

  useEffect(() => {
    const canvas = gl.domElement;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!activeRef.current || document.pointerLockElement !== canvas) return;
      pressKey(pressed.current, event.code, true);
      if (isGameControl(event.code)) event.preventDefault();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      releaseKey(pressed.current, event.code);
    };
    const clearInput = () => clearPressedKeys(pressed.current);
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') clearInput();
    };
    const onMouseMove = (event: MouseEvent) => {
      if (!activeRef.current || document.pointerLockElement !== canvas) return;
      if (!Number.isFinite(event.movementX) || !Number.isFinite(event.movementY)) return;
      const delta = mouseLookDelta(event.movementX, event.movementY, invertYRef.current);
      yaw.current += delta.yaw;
      pitch.current = Math.max(-1.35, Math.min(1.35, pitch.current + delta.pitch));
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearInput);
    document.addEventListener('visibilitychange', onVisibilityChange);
    document.addEventListener('mousemove', onMouseMove);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearInput);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      document.removeEventListener('mousemove', onMouseMove);
    };
  }, [gl]);

  useFrame(({ clock }, delta) => {
    if (!Number.isFinite(yaw.current) || !Number.isFinite(pitch.current)) {
      yaw.current = 0;
      pitch.current = 0;
    }
    rotation.set(pitch.current, yaw.current, 0);
    camera.quaternion.setFromEuler(rotation);

    const rigidBody = body.current;
    if (!rigidBody) return;
    const position = rigidBody.translation();
    if (shouldResetPlayerPosition(position.x, position.y, position.z)) {
      resetBody(rigidBody);
      camera.position.set(
        PLAYER_SPAWN[0],
        PLAYER_SPAWN[1] + CAMERA_EYE_OFFSET,
        PLAYER_SPAWN[2],
      );
      clearPressedKeys(pressed.current);
      return;
    }

    camera.position.set(position.x, position.y + CAMERA_EYE_OFFSET, position.z);
    if (
      DEVELOPMENT_DIAGNOSTICS.enabled &&
      clock.elapsedTime - lastDiagnosticSample.current >=
        DEVELOPMENT_DIAGNOSTICS.sampleIntervalSeconds
    ) {
      lastDiagnosticSample.current = clock.elapsedTime;
      reportRuntimeDiagnostics({
        input: Object.keys(pressed.current),
        player: [position.x, position.y, position.z],
      });
    }

    if (!activeRef.current) return;
    if (!Number.isFinite(delta) || delta > MAX_FRAME_DELTA) {
      clearPressedKeys(pressed.current);
      const velocity = rigidBody.linvel();
      rigidBody.setLinvel(
        { x: 0, y: Number.isFinite(velocity.y) ? velocity.y : 0, z: 0 },
        true,
      );
      return;
    }

    const input = movementVector(movementInput(pressed.current));
    camera.getWorldDirection(cameraDirection);
    cameraDirection.y = 0;
    if (
      !Number.isFinite(cameraDirection.x) ||
      !Number.isFinite(cameraDirection.y) ||
      !Number.isFinite(cameraDirection.z)
    )
      return;
    cameraDirection.normalize();
    walkDirection.crossVectors(cameraDirection, UP).multiplyScalar(input[0]);
    walkDirection.addScaledVector(cameraDirection, -input[1]);
    const hasInput = input[0] !== 0 || input[1] !== 0;
    if (hasInput) walkDirection.normalize();

    const velocity = rigidBody.linvel();
    const safeVerticalVelocity = Number.isFinite(velocity.y) ? velocity.y : 0;
    rigidBody.setLinvel(
      {
        x: hasInput ? walkDirection.x * MOVE_SPEED : 0,
        y: safeVerticalVelocity,
        z: hasInput ? walkDirection.z * MOVE_SPEED : 0,
      },
      true,
    );
    if (pressed.current.Space && Math.abs(safeVerticalVelocity) < 0.12) {
      rigidBody.setLinvel(
        {
          x: hasInput ? walkDirection.x * MOVE_SPEED : 0,
          y: JUMP_VELOCITY,
          z: hasInput ? walkDirection.z * MOVE_SPEED : 0,
        },
        true,
      );
      releaseKey(pressed.current, 'Space');
    }
  });

  return (
    <RigidBody
      ref={body}
      position={PLAYER_SPAWN}
      enabledRotations={[false, false, false]}
      canSleep={false}
      ccd
      friction={0}
      linearDamping={7}
    >
      <CapsuleCollider args={[0.45, 0.34]} />
    </RigidBody>
  );
}
