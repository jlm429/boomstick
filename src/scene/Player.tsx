import { useFrame, useThree } from '@react-three/fiber';
import { CapsuleCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import { useEffect, useRef } from 'react';
import { Euler, Vector3 } from 'three';
import { JUMP_VELOCITY, MOVE_SPEED, PLAYER_SPAWN } from '../game/constants';
import { movementVector } from '../game/movement';

const UP = new Vector3(0, 1, 0);
const walkDirection = new Vector3();
const cameraDirection = new Vector3();
const rotation = new Euler(0, 0, 0, 'YXZ');

type Pressed = Record<string, boolean>;

export function Player({ active }: { active: boolean }) {
  const body = useRef<RapierRigidBody>(null);
  const pressed = useRef<Pressed>({});
  const yaw = useRef(0);
  const pitch = useRef(0);
  const { camera, gl } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;
    const onKeyDown = (event: KeyboardEvent) => {
      pressed.current[event.code] = true;
      if (event.code === 'Space') event.preventDefault();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      pressed.current[event.code] = false;
    };
    const onMouseMove = (event: MouseEvent) => {
      if (document.pointerLockElement !== canvas || !active) return;
      yaw.current -= event.movementX * 0.0022;
      pitch.current = Math.max(-1.35, Math.min(1.35, pitch.current - event.movementY * 0.0022));
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousemove', onMouseMove);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('mousemove', onMouseMove);
    };
  }, [active, gl]);

  useFrame(() => {
    rotation.set(pitch.current, yaw.current, 0);
    camera.quaternion.setFromEuler(rotation);
    const rigidBody = body.current;
    if (!rigidBody || !active) return;
    const input = movementVector({
      forward: Boolean(pressed.current.KeyW),
      backward: Boolean(pressed.current.KeyS),
      left: Boolean(pressed.current.KeyA),
      right: Boolean(pressed.current.KeyD),
    });
    camera.getWorldDirection(cameraDirection);
    cameraDirection.y = 0;
    cameraDirection.normalize();
    walkDirection.crossVectors(cameraDirection, UP).multiplyScalar(input[0]);
    walkDirection.addScaledVector(cameraDirection, -input[1]).normalize();
    const velocity = rigidBody.linvel();
    const hasInput = input[0] !== 0 || input[1] !== 0;
    rigidBody.setLinvel(
      {
        x: hasInput ? walkDirection.x * MOVE_SPEED : 0,
        y: velocity.y,
        z: hasInput ? walkDirection.z * MOVE_SPEED : 0,
      },
      true,
    );
    if (pressed.current.Space && Math.abs(velocity.y) < 0.12) {
      rigidBody.setLinvel({ x: velocity.x, y: JUMP_VELOCITY, z: velocity.z }, true);
      pressed.current.Space = false;
    }
    const position = rigidBody.translation();
    camera.position.set(position.x, position.y + 0.48, position.z);
  });

  return (
    <RigidBody
      ref={body}
      position={PLAYER_SPAWN}
      enabledRotations={[false, false, false]}
      friction={0}
      linearDamping={7}
    >
      <CapsuleCollider args={[0.45, 0.34]} />
    </RigidBody>
  );
}
