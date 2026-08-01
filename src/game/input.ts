import type { MovementInput } from './movement';

export type PressedKeys = Record<string, boolean>;
export type GameplayAction = 'aim-fire' | 'fire' | 'reload';
export type TouchFireCoordinates = Readonly<{
  clientX: number;
  clientY: number;
}>;
export type GameplayActionListener = (coordinates?: TouchFireCoordinates) => void;
export type LookOrientation = Readonly<{ yaw: number; pitch: number }>;

export type TouchControlCapabilities = Readonly<{
  maxTouchPoints: number;
  coarsePrimaryPointer: boolean;
}>;

export type TouchInputState = Readonly<{
  setMovement: (x: number, z: number) => void;
  movement: () => readonly [x: number, z: number];
  addLook: (x: number, y: number) => void;
  consumeLook: () => readonly [x: number, y: number];
  requestJump: () => void;
  hasJumpRequest: () => boolean;
  consumeJump: () => boolean;
  requestAction: (action: GameplayAction, coordinates?: TouchFireCoordinates) => void;
  subscribeAction: (action: GameplayAction, listener: GameplayActionListener) => () => void;
  clear: () => void;
}>;

export const GAME_CONTROL_CODES = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'] as const;
const BASE_TOUCH_LOOK_SENSITIVITY = 0.004;
export const MOBILE_LOOK_SENSITIVITY_MULTIPLIER = 1.8;
export const TOUCH_LOOK_SENSITIVITY =
  BASE_TOUCH_LOOK_SENSITIVITY * MOBILE_LOOK_SENSITIVITY_MULTIPLIER;
const MOUSE_LOOK_SENSITIVITY = 0.0022;
export const MAX_LOOK_PITCH_RADIANS = 1.35;

export const supportsTouchControls = ({
  maxTouchPoints,
  coarsePrimaryPointer,
}: TouchControlCapabilities) =>
  Number.isFinite(maxTouchPoints) && maxTouchPoints > 0 && coarsePrimaryPointer;

export const createPressedKeys = (): PressedKeys => ({});

export function createTouchInputState(): TouchInputState {
  let movementX = 0;
  let movementZ = 0;
  let lookX = 0;
  let lookY = 0;
  let jumpRequested = false;
  const listeners: Record<GameplayAction, Set<GameplayActionListener>> = {
    'aim-fire': new Set(),
    fire: new Set(),
    reload: new Set(),
  };
  const pendingActions: Record<GameplayAction, (TouchFireCoordinates | undefined)[]> = {
    'aim-fire': [],
    fire: [],
    reload: [],
  };

  return {
    setMovement: (x, z) => {
      if (!Number.isFinite(x) || !Number.isFinite(z)) {
        movementX = 0;
        movementZ = 0;
        return;
      }
      const length = Math.hypot(x, z);
      const scale = length > 1 ? 1 / length : 1;
      movementX = x * scale;
      movementZ = z * scale;
    },
    movement: () => [movementX, movementZ],
    addLook: (x, y) => {
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      lookX += x;
      lookY += y;
    },
    consumeLook: () => {
      const delta = [lookX, lookY] as const;
      lookX = 0;
      lookY = 0;
      return delta;
    },
    requestJump: () => {
      jumpRequested = true;
    },
    hasJumpRequest: () => jumpRequested,
    consumeJump: () => {
      const requested = jumpRequested;
      jumpRequested = false;
      return requested;
    },
    requestAction: (action, coordinates) => {
      if (listeners[action].size === 0) {
        pendingActions[action].push(coordinates);
        return;
      }
      for (const listener of listeners[action]) listener(coordinates);
    },
    subscribeAction: (action, listener) => {
      listeners[action].add(listener);
      const pending = pendingActions[action].splice(0);
      for (const coordinates of pending) listener(coordinates);
      return () => listeners[action].delete(listener);
    },
    clear: () => {
      movementX = 0;
      movementZ = 0;
      lookX = 0;
      lookY = 0;
      jumpRequested = false;
      pendingActions['aim-fire'].length = 0;
      pendingActions.fire.length = 0;
      pendingActions.reload.length = 0;
    },
  };
}

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
  yaw: -movementX * MOUSE_LOOK_SENSITIVITY,
  pitch: (invertY ? 1 : -1) * movementY * MOUSE_LOOK_SENSITIVITY,
});

export const touchLookDelta = (movementX: number, movementY: number, invertY: boolean) => ({
  yaw: -movementX * TOUCH_LOOK_SENSITIVITY,
  pitch: (invertY ? 1 : -1) * movementY * TOUCH_LOOK_SENSITIVITY,
});

export function consumeTouchLookOrientation(
  input: TouchInputState,
  currentYaw: number,
  currentPitch: number,
  invertY: boolean,
): LookOrientation {
  const [movementX, movementY] = input.consumeLook();
  const delta = touchLookDelta(movementX, movementY, invertY);
  return {
    yaw: currentYaw + delta.yaw,
    pitch: clampLookPitch(currentPitch + delta.pitch),
  };
}

export const clampLookPitch = (pitch: number) =>
  Math.max(-MAX_LOOK_PITCH_RADIANS, Math.min(MAX_LOOK_PITCH_RADIANS, pitch));
