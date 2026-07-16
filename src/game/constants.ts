export const APP_VERSION = '0.1.0';
export const ARENA_HALF_EXTENT = 24;
export const PLAYER_SPAWN: [number, number, number] = [0, 1.2, 12];
export const MOVE_SPEED = 8;
export const JUMP_VELOCITY = 7.2;
export const CAMERA_EYE_OFFSET = 0.68;
export const MAX_FRAME_DELTA = 0.1;

export function isValidSpawn([x, y, z]: readonly [number, number, number]) {
  return (
    Number.isFinite(x) &&
    Number.isFinite(y) &&
    Number.isFinite(z) &&
    y > 0 &&
    Math.abs(x) < ARENA_HALF_EXTENT - 1 &&
    Math.abs(z) < ARENA_HALF_EXTENT - 1
  );
}
