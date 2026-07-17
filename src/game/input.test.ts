import { describe, expect, it } from 'vitest';
import {
  clearPressedKeys,
  createPressedKeys,
  movementInput,
  mouseLookDelta,
  pressKey,
  releaseKey,
} from './input';

describe('input lifecycle', () => {
  it('enables movement only while play input is active', () => {
    const pressed = createPressedKeys();
    pressKey(pressed, 'KeyW', false);
    expect(movementInput(pressed).forward).toBe(false);
    pressKey(pressed, 'KeyW', true);
    expect(movementInput(pressed).forward).toBe(true);
  });

  it('tracks keydown and keyup without retaining released keys', () => {
    const pressed = createPressedKeys();
    pressKey(pressed, 'KeyA', true);
    pressKey(pressed, 'Space', true);
    releaseKey(pressed, 'KeyA');
    expect(pressed.KeyA).toBeUndefined();
    expect(pressed.Space).toBe(true);
  });

  it('clears movement and jump input on pause or blur', () => {
    const pressed = createPressedKeys();
    pressKey(pressed, 'KeyD', true);
    pressKey(pressed, 'Space', true);
    clearPressedKeys(pressed);
    expect(movementInput(pressed)).toEqual({
      forward: false,
      backward: false,
      left: false,
      right: false,
    });
    expect(pressed.Space).toBeUndefined();
  });

  it('inverts only vertical mouse look when requested', () => {
    const regular = mouseLookDelta(10, 8, false);
    const inverted = mouseLookDelta(10, 8, true);
    expect(regular.yaw).toBeCloseTo(-0.022);
    expect(inverted.yaw).toBeCloseTo(regular.yaw);
    expect(regular.pitch).toBeCloseTo(-0.0176);
    expect(inverted.pitch).toBeCloseTo(0.0176);
  });
});
