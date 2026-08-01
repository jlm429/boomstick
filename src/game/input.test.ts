import { describe, expect, it, vi } from 'vitest';
import {
  clearPressedKeys,
  clampLookPitch,
  createPressedKeys,
  createTouchInputState,
  MAX_LOOK_PITCH_RADIANS,
  MOBILE_LOOK_SENSITIVITY_MULTIPLIER,
  movementInput,
  mouseLookDelta,
  pressKey,
  releaseKey,
  supportsTouchControls,
  touchLookDelta,
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

  it('keeps desktop mouse sensitivity unchanged and gives touch look its own scale', () => {
    const mouse = mouseLookDelta(10, 8, false);
    const touch = touchLookDelta(10, 8, false);
    const invertedTouch = touchLookDelta(10, 8, true);
    expect(mouse.yaw).toBeCloseTo(-0.022);
    expect(mouse.pitch).toBeCloseTo(-0.0176);
    expect(MOBILE_LOOK_SENSITIVITY_MULTIPLIER).toBe(1.8);
    expect(touch.yaw).toBeCloseTo(-0.072);
    expect(touch.pitch).toBeCloseTo(-0.0576);
    expect(invertedTouch.yaw).toBeCloseTo(-0.072);
    expect(invertedTouch.pitch).toBeCloseTo(0.0576);
  });

  it('clamps touch and mouse pitch at the shared authoritative limits', () => {
    expect(clampLookPitch(MAX_LOOK_PITCH_RADIANS + 1)).toBe(MAX_LOOK_PITCH_RADIANS);
    expect(clampLookPitch(-MAX_LOOK_PITCH_RADIANS - 1)).toBe(-MAX_LOOK_PITCH_RADIANS);
    expect(clampLookPitch(0.42)).toBe(0.42);
  });
});

describe('touch capability', () => {
  it('requires both reported touch points and a coarse primary pointer', () => {
    expect(supportsTouchControls({ maxTouchPoints: 5, coarsePrimaryPointer: true })).toBe(true);
    expect(supportsTouchControls({ maxTouchPoints: 0, coarsePrimaryPointer: true })).toBe(
      false,
    );
    expect(supportsTouchControls({ maxTouchPoints: 5, coarsePrimaryPointer: false })).toBe(
      false,
    );
  });
});

describe('touch input state', () => {
  it('normalizes movement and consumes accumulated look and jump input', () => {
    const input = createTouchInputState();

    input.setMovement(1, -1);
    expect(Math.hypot(...input.movement())).toBeCloseTo(1);
    input.addLook(4, -3);
    input.addLook(2, 1);
    expect(input.consumeLook()).toEqual([6, -2]);
    expect(input.consumeLook()).toEqual([0, 0]);

    input.requestJump();
    expect(input.hasJumpRequest()).toBe(true);
    expect(input.consumeJump()).toBe(true);
    expect(input.consumeJump()).toBe(false);
  });

  it('dispatches gameplay actions only to current subscribers', () => {
    const input = createTouchInputState();
    const fire = vi.fn();
    const unsubscribe = input.subscribeAction('fire', fire);

    input.requestAction('fire', { clientX: 320, clientY: 180 });
    unsubscribe();
    input.requestAction('fire', { clientX: 120, clientY: 90 });

    expect(fire).toHaveBeenCalledOnce();
    expect(fire).toHaveBeenCalledWith({ clientX: 320, clientY: 180 });
  });

  it('sequences an aim tap before its single authoritative fire action', () => {
    const input = createTouchInputState();
    const sequence: string[] = [];
    const coordinates = { clientX: 320, clientY: 180 };
    input.subscribeAction('aim-fire', (received) => {
      sequence.push(`aim:${received?.clientX},${received?.clientY}`);
      input.requestAction('fire', received);
    });
    input.subscribeAction('fire', (received) => {
      sequence.push(`fire:${received?.clientX},${received?.clientY}`);
    });

    input.requestAction('aim-fire', coordinates);

    expect(sequence).toEqual(['aim:320,180', 'fire:320,180']);
  });

  it('clears every held or queued transient without removing action subscriptions', () => {
    const input = createTouchInputState();
    let reloadCount = 0;
    input.subscribeAction('reload', () => {
      reloadCount += 1;
    });
    input.setMovement(0.5, -0.75);
    input.addLook(10, 8);
    input.requestJump();

    input.clear();

    expect(input.movement()).toEqual([0, 0]);
    expect(input.consumeLook()).toEqual([0, 0]);
    expect(input.hasJumpRequest()).toBe(false);
    input.requestAction('reload');
    expect(reloadCount).toBe(1);
  });
});
