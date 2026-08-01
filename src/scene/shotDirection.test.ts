import { Euler, Group, PerspectiveCamera, Raycaster, Vector2, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { MAX_LOOK_PITCH_RADIANS } from '../game/input';
import {
  aimOrientationFromClientPoint,
  alignWeaponWithCamera,
  applyCameraAim,
  shotDirectionFromClientPoint,
  type CanvasClientBounds,
} from './shotDirection';

const bounds: CanvasClientBounds = {
  left: 20,
  top: 10,
  width: 390,
  height: 844,
};

function createCamera() {
  const camera = new PerspectiveCamera(76, bounds.width / bounds.height, 0.1, 120);
  camera.position.set(2, 3, 5);
  camera.rotation.order = 'YXZ';
  camera.rotation.set(-0.18, 0.42, 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  return camera;
}

describe('shotDirectionFromClientPoint', () => {
  it('maps the Canvas center to the unchanged camera-forward direction', () => {
    const camera = createCamera();
    const expected = camera.getWorldDirection(new Vector3());
    const actual = shotDirectionFromClientPoint(
      camera,
      bounds,
      {
        clientX: bounds.left + bounds.width / 2,
        clientY: bounds.top + bounds.height / 2,
      },
      new Vector3(),
    );

    expect(actual.distanceTo(expected)).toBeLessThan(1e-10);
  });

  it('applies an off-center tap to the authoritative camera before firing', () => {
    const camera = createCamera();
    const coordinates = {
      clientX: bounds.left + bounds.width * 0.8,
      clientY: bounds.top + bounds.height * 0.2,
    };
    const expectedDirection = shotDirectionFromClientPoint(
      camera,
      bounds,
      coordinates,
      new Vector3(),
    ).clone();
    const orientation = aimOrientationFromClientPoint(
      camera,
      bounds,
      coordinates,
      camera.rotation.y,
      new Vector3(),
    );
    const sequence: string[] = [];

    applyCameraAim(camera, orientation, new Euler());
    sequence.push('aim');
    const firedDirection = camera.getWorldDirection(new Vector3());
    sequence.push('fire');

    expect(sequence).toEqual(['aim', 'fire']);
    expect(firedDirection.distanceTo(expectedDirection)).toBeLessThan(1e-10);
    expect(camera.rotation.x).toBeCloseTo(orientation.pitch);
    expect(camera.rotation.y).toBeCloseTo(orientation.yaw);
  });

  it('keeps yaw continuous and clamps extreme tap pitch at the drag-look limits', () => {
    const camera = createCamera();
    const continuousYaw = Math.PI * 4 + camera.rotation.y;
    const center = {
      clientX: bounds.left + bounds.width / 2,
      clientY: bounds.top + bounds.height / 2,
    };
    const centered = aimOrientationFromClientPoint(
      camera,
      bounds,
      center,
      continuousYaw,
      new Vector3(),
    );
    const top = aimOrientationFromClientPoint(
      camera,
      bounds,
      { clientX: center.clientX, clientY: -100_000 },
      centered.yaw,
      new Vector3(),
    );

    expect(centered.yaw).toBeCloseTo(continuousYaw);
    expect(top.pitch).toBe(MAX_LOOK_PITCH_RADIANS);
  });

  it('aligns the visible weapon presentation with the camera aim', () => {
    const camera = createCamera();
    const weapon = new Group();

    alignWeaponWithCamera(weapon, camera);
    weapon.updateMatrixWorld(true);
    const cameraForward = camera.getWorldDirection(new Vector3());
    const weaponForward = new Vector3(0, 0, -1).applyQuaternion(weapon.quaternion);

    expect(weapon.position.equals(camera.position)).toBe(true);
    expect(weapon.quaternion.equals(camera.quaternion)).toBe(true);
    expect(weaponForward.distanceTo(cameraForward)).toBeLessThan(1e-10);
  });

  it('maps an off-center point through the camera projection without rotating the camera', () => {
    const camera = createCamera();
    const position = camera.position.clone();
    const quaternion = camera.quaternion.clone();
    const rotation = camera.rotation.clone();
    const coordinates = {
      clientX: bounds.left + bounds.width * 0.75,
      clientY: bounds.top + bounds.height * 0.25,
    };
    const expectedRay = new Raycaster();
    expectedRay.setFromCamera(new Vector2(0.5, 0.5), camera);

    const actual = shotDirectionFromClientPoint(camera, bounds, coordinates, new Vector3());

    expect(actual.distanceTo(expectedRay.ray.direction)).toBeLessThan(1e-10);
    expect(actual.distanceTo(camera.getWorldDirection(new Vector3()))).toBeGreaterThan(0.1);
    expect(camera.position.equals(position)).toBe(true);
    expect(camera.quaternion.equals(quaternion)).toBe(true);
    expect(camera.rotation.equals(rotation)).toBe(true);
  });

  it('falls back to camera-forward aiming for invalid Canvas measurements', () => {
    const camera = createCamera();
    const expected = camera.getWorldDirection(new Vector3());

    expect(
      shotDirectionFromClientPoint(
        camera,
        { ...bounds, width: 0 },
        { clientX: 100, clientY: 200 },
        new Vector3(),
      ).distanceTo(expected),
    ).toBeLessThan(1e-10);
  });
});
