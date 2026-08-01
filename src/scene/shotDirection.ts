import { type Camera, Euler, type Object3D, Vector3 } from 'three';
import { clampLookPitch, type TouchFireCoordinates } from '../game/input';

export type CanvasClientBounds = Readonly<{
  left: number;
  top: number;
  width: number;
  height: number;
}>;

export type AimOrientation = Readonly<{
  yaw: number;
  pitch: number;
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

export function aimOrientationFromClientPoint(
  camera: Camera,
  bounds: CanvasClientBounds,
  coordinates: TouchFireCoordinates,
  currentYaw: number,
  targetDirection: Vector3,
): AimOrientation {
  const direction = shotDirectionFromClientPoint(camera, bounds, coordinates, targetDirection);
  const normalizedYaw = Math.atan2(-direction.x, -direction.z);
  const shortestYawDelta = Math.atan2(
    Math.sin(normalizedYaw - currentYaw),
    Math.cos(normalizedYaw - currentYaw),
  );
  return {
    yaw: currentYaw + shortestYawDelta,
    pitch: clampLookPitch(Math.asin(Math.max(-1, Math.min(1, direction.y)))),
  };
}

export function applyCameraAim(
  camera: Camera,
  orientation: AimOrientation,
  targetRotation: Euler,
) {
  targetRotation.set(orientation.pitch, orientation.yaw, 0, 'YXZ');
  camera.quaternion.setFromEuler(targetRotation);
  camera.updateMatrixWorld(true);
}

export function alignWeaponWithCamera(weapon: Object3D, camera: Camera) {
  weapon.position.copy(camera.position);
  weapon.quaternion.copy(camera.quaternion);
}
