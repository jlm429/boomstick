import type { MovementInput } from './movement';

export type PressedKeys = Record<string, boolean>;

export const GAME_CONTROL_CODES = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'] as const;

export const createPressedKeys = (): PressedKeys => ({});

export const pressKey = (pressed: PressedKeys, code: string, enabled: boolean) => {
  if (enabled && GAME_CONTROL_CODES.includes(code as (typeof GAME_CONTROL_CODES)[number])) {
    pressed[code] = true;
  }
};

export const releaseKey = (pressed: PressedKeys, code: string) => {
  delete pressed[code];
};

export const clearPressedKeys = (pressed: PressedKeys) => {
  for (const code of Object.keys(pressed)) delete pressed[code];
};

export const movementInput = (pressed: PressedKeys): MovementInput => ({
  forward: Boolean(pressed.KeyW),
  backward: Boolean(pressed.KeyS),
  left: Boolean(pressed.KeyA),
  right: Boolean(pressed.KeyD),
});

export const isGameControl = (code: string) =>
  GAME_CONTROL_CODES.includes(code as (typeof GAME_CONTROL_CODES)[number]);

export const mouseLookDelta = (movementX: number, movementY: number, invertY: boolean) => ({
  yaw: -movementX * 0.0022,
  pitch: (invertY ? 1 : -1) * movementY * 0.0022,
});
