import { render } from '@testing-library/react';
import { StrictMode, type PropsWithChildren } from 'react';
import { Euler, PerspectiveCamera, Vector3 } from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  consumeTouchLookOrientation,
  createTouchInputState,
  type TouchFireCoordinates,
} from '../game/input';
import { Player } from './Player';
import { aimOrientationFromClientPoint, applyCameraAim } from './shotDirection';

let camera: PerspectiveCamera;
let canvas: HTMLCanvasElement;

vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
  useThree: () => ({ camera, gl: { domElement: canvas } }),
}));

vi.mock('@react-three/rapier', () => ({
  CapsuleCollider: () => null,
  RigidBody: ({ children }: PropsWithChildren) => children,
}));

const bounds = {
  bottom: 844,
  height: 844,
  left: 0,
  right: 390,
  top: 0,
  width: 390,
  x: 0,
  y: 0,
  toJSON: () => ({}),
};

function createCamera() {
  const nextCamera = new PerspectiveCamera(76, bounds.width / bounds.height, 0.1, 120);
  nextCamera.position.set(2, 3, 5);
  nextCamera.rotation.order = 'YXZ';
  nextCamera.rotation.set(0, 0, 0);
  nextCamera.updateProjectionMatrix();
  nextCamera.updateMatrixWorld(true);
  return nextCamera;
}

describe('Player input readiness', () => {
  beforeEach(() => {
    camera = createCamera();
    canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue(bounds);
  });

  it('delivers a queued startup tap once after Player effects establish authority', () => {
    const input = createTouchInputState();
    const fire = vi.fn<(coordinates?: TouchFireCoordinates) => void>();
    const coordinates = { clientX: 280, clientY: 240 };
    input.subscribeAction('fire', fire);
    input.addLook(24, -12);
    input.requestAction('aim-fire', coordinates);

    const expectedCamera = camera.clone();
    const expectedInput = createTouchInputState();
    expectedInput.addLook(24, -12);
    const dragOrientation = consumeTouchLookOrientation(
      expectedInput,
      expectedCamera.rotation.y,
      expectedCamera.rotation.x,
      false,
    );
    applyCameraAim(expectedCamera, dragOrientation, new Euler());
    const tapOrientation = aimOrientationFromClientPoint(
      expectedCamera,
      bounds,
      coordinates,
      dragOrientation.yaw,
      new Vector3(),
    );
    applyCameraAim(expectedCamera, tapOrientation, new Euler());

    render(
      <StrictMode>
        <Player active invertY={false} lifeState="alive" touchInput={input} />
      </StrictMode>,
    );

    expect(fire).toHaveBeenCalledOnce();
    expect(fire).toHaveBeenCalledWith(coordinates);
    expect(input.consumeLook()).toEqual([0, 0]);
    expect(camera.getWorldDirection(new Vector3()).distanceTo(
      expectedCamera.getWorldDirection(new Vector3()),
    )).toBeLessThan(1e-10);
  });
});
