import { type Camera, Vector3 } from 'three';
import type { TouchFireCoordinates } from '../game/input';

export type CanvasClientBounds = Readonly<{
  left: number;
  top: number;
  width: number;
  height: number;
}>;

export function shotDirectionFromClientPoint(
  camera: Camera,
  bounds: CanvasClientBounds,
  coordinates: TouchFireCoordinates,
  target: Vector3,
) {
  if (
    !Number.isFinite(coordinates.clientX) ||
    !Number.isFinite(coordinates.clientY) ||
    !Number.isFinite(bounds.left) ||
    !Number.isFinite(bounds.top) ||
    !Number.isFinite(bounds.width) ||
    !Number.isFinite(bounds.height) ||
    bounds.width <= 0 ||
    bounds.height <= 0
  ) {
    return camera.getWorldDirection(target);
  }

  const normalizedX = ((coordinates.clientX - bounds.left) / bounds.width) * 2 - 1;
  const normalizedY = -((coordinates.clientY - bounds.top) / bounds.height) * 2 + 1;
  return target
    .set(normalizedX, normalizedY, 0.5)
    .unproject(camera)
    .sub(camera.position)
    .normalize();
}
