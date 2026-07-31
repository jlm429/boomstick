import { PerspectiveCamera, Raycaster, Vector2, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { shotDirectionFromClientPoint, type CanvasClientBounds } from './shotDirection';

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
