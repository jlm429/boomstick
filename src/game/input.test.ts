import { describe, expect, it } from 'vitest';
import {
  clearPressedKeys,
  createPressedKeys,
  movementInput,
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
});
