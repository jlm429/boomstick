export const APP_VERSION = '0.1.0';
export const ARENA_HALF_EXTENT = 18;
export const PLAYER_SPAWN: [number, number, number] = [0, 1.8, 8];
export const MOVE_SPEED = 8;
export const JUMP_VELOCITY = 7.2;

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
