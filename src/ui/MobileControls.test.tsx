import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTouchInputState } from '../game/input';
import {
  MOBILE_TAP_MAX_DURATION_MS,
  MOBILE_TAP_MOVE_THRESHOLD_PX,
  MobileControls,
} from './MobileControls';

function mockMovementBounds(element: HTMLElement) {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    bottom: 100,
    height: 100,
    left: 0,
    right: 100,
    top: 0,
    width: 100,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
}

describe('MobileControls', () => {
  afterEach(() => vi.restoreAllMocks());

  it('maps owned pointers to movement and look state', () => {
    const input = createTouchInputState();
    render(<MobileControls input={input} onPause={vi.fn()} />);
    const movement = screen.getByTestId('mobile-movement');
    mockMovementBounds(movement);

    fireEvent.pointerDown(movement, { button: 0, clientX: 50, clientY: 16, pointerId: 1 });
    expect(input.movement()[0]).toBeCloseTo(0);
    expect(input.movement()[1]).toBeCloseTo(-1);
    fireEvent.pointerUp(movement, { button: 0, clientX: 50, clientY: 16, pointerId: 1 });
    expect(input.movement()).toEqual([0, 0]);

    const look = screen.getByTestId('mobile-look-zone');
    fireEvent.pointerDown(look, { button: 0, clientX: 100, clientY: 80, pointerId: 2 });
    fireEvent.pointerMove(look, { clientX: 124, clientY: 68, pointerId: 2 });
    expect(input.consumeLook()).toEqual([24, -12]);
    fireEvent.pointerUp(look, { button: 0, clientX: 124, clientY: 68, pointerId: 2 });
  });

  it('fires exactly once after a short tap and never repeats while held', () => {
    let now = 100;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const input = createTouchInputState();
    const fire = vi.fn();
    input.subscribeAction('fire', fire);
    render(<MobileControls input={input} onPause={vi.fn()} />);
    const look = screen.getByTestId('mobile-look-zone');

    fireEvent.pointerDown(look, { button: 0, clientX: 200, clientY: 120, pointerId: 1 });
    now += MOBILE_TAP_MAX_DURATION_MS - 1;
    expect(fire).not.toHaveBeenCalled();

    fireEvent.pointerUp(look, { button: 0, clientX: 203, clientY: 123, pointerId: 1 });
    fireEvent.pointerUp(look, { button: 0, clientX: 203, clientY: 123, pointerId: 1 });

    expect(fire).toHaveBeenCalledOnce();
    expect(input.consumeLook()).toEqual([0, 0]);
  });

  it('classifies from the furthest movement even when the pointer returns near its start', () => {
    vi.spyOn(performance, 'now').mockReturnValue(100);
    const input = createTouchInputState();
    const fire = vi.fn();
    input.subscribeAction('fire', fire);
    render(<MobileControls input={input} onPause={vi.fn()} />);
    const look = screen.getByTestId('mobile-look-zone');

    fireEvent.pointerDown(look, { button: 0, clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(look, {
      clientX: 100 + MOBILE_TAP_MOVE_THRESHOLD_PX - 1,
      clientY: 100,
      pointerId: 1,
    });
    expect(input.consumeLook()).toEqual([0, 0]);

    fireEvent.pointerMove(look, {
      clientX: 100 + MOBILE_TAP_MOVE_THRESHOLD_PX,
      clientY: 100,
      pointerId: 1,
    });
    expect(input.consumeLook()).toEqual([MOBILE_TAP_MOVE_THRESHOLD_PX, 0]);

    fireEvent.pointerMove(look, { clientX: 101, clientY: 100, pointerId: 1 });
    expect(input.consumeLook()).toEqual([1 - MOBILE_TAP_MOVE_THRESHOLD_PX, 0]);
    fireEvent.pointerUp(look, { button: 0, clientX: 101, clientY: 100, pointerId: 1 });

    expect(fire).not.toHaveBeenCalled();
  });

  it('does not fire after a long hold, pointer cancellation, or lost capture', () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const input = createTouchInputState();
    const fire = vi.fn();
    input.subscribeAction('fire', fire);
    render(<MobileControls input={input} onPause={vi.fn()} />);
    const look = screen.getByTestId('mobile-look-zone');

    fireEvent.pointerDown(look, { button: 0, clientX: 180, clientY: 100, pointerId: 1 });
    now = MOBILE_TAP_MAX_DURATION_MS;
    fireEvent.pointerUp(look, { button: 0, clientX: 180, clientY: 100, pointerId: 1 });

    fireEvent.pointerDown(look, { button: 0, clientX: 180, clientY: 100, pointerId: 2 });
    fireEvent.pointerCancel(look, { clientX: 180, clientY: 100, pointerId: 2 });

    fireEvent.pointerDown(look, { button: 0, clientX: 180, clientY: 100, pointerId: 3 });
    fireEvent.lostPointerCapture(look, { clientX: 180, clientY: 100, pointerId: 3 });

    expect(fire).not.toHaveBeenCalled();
  });

  it('invalidates a tap when another look pointer is added or removed', () => {
    vi.spyOn(performance, 'now').mockReturnValue(100);
    const input = createTouchInputState();
    const fire = vi.fn();
    input.subscribeAction('fire', fire);
    render(<MobileControls input={input} onPause={vi.fn()} />);
    const look = screen.getByTestId('mobile-look-zone');

    fireEvent.pointerDown(look, { button: 0, clientX: 200, clientY: 120, pointerId: 1 });
    fireEvent.pointerDown(look, { button: 0, clientX: 240, clientY: 120, pointerId: 2 });
    fireEvent.pointerUp(look, { button: 0, clientX: 240, clientY: 120, pointerId: 2 });
    fireEvent.pointerUp(look, { button: 0, clientX: 200, clientY: 120, pointerId: 1 });

    fireEvent.pointerDown(look, { button: 0, clientX: 200, clientY: 120, pointerId: 3 });
    const reload = screen.getByRole('button', { name: 'Reload' });
    fireEvent.pointerDown(reload, { button: 0, pointerId: 4 });
    fireEvent.pointerUp(reload, { button: 0, pointerId: 4 });
    fireEvent.pointerUp(look, { button: 0, clientX: 200, clientY: 120, pointerId: 3 });

    expect(fire).not.toHaveBeenCalled();
  });

  it('preserves movement with look, tap shooting, and reload', () => {
    let now = 100;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const input = createTouchInputState();
    const fire = vi.fn();
    const reload = vi.fn();
    input.subscribeAction('fire', fire);
    input.subscribeAction('reload', reload);
    render(<MobileControls input={input} onPause={vi.fn()} />);
    const movement = screen.getByTestId('mobile-movement');
    const look = screen.getByTestId('mobile-look-zone');
    mockMovementBounds(movement);

    fireEvent.pointerDown(movement, {
      button: 0,
      clientX: 84,
      clientY: 50,
      pointerId: 1,
    });
    fireEvent.pointerDown(look, { button: 0, clientX: 200, clientY: 100, pointerId: 2 });
    fireEvent.pointerMove(look, { clientX: 220, clientY: 100, pointerId: 2 });
    fireEvent.pointerUp(look, { button: 0, clientX: 220, clientY: 100, pointerId: 2 });

    expect(input.movement()[0]).toBeCloseTo(1);
    expect(input.consumeLook()).toEqual([20, 0]);
    expect(fire).not.toHaveBeenCalled();

    now += 100;
    fireEvent.pointerDown(look, { button: 0, clientX: 200, clientY: 100, pointerId: 3 });
    now += 100;
    fireEvent.pointerUp(look, { button: 0, clientX: 200, clientY: 100, pointerId: 3 });
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Reload' }), {
      button: 0,
      pointerId: 4,
    });

    expect(input.movement()[0]).toBeCloseTo(1);
    expect(fire).toHaveBeenCalledOnce();
    expect(reload).toHaveBeenCalledOnce();
  });

  it('keeps movement and action controls from becoming look or tap input', () => {
    const input = createTouchInputState();
    const onPause = vi.fn();
    const fire = vi.fn();
    const reload = vi.fn();
    input.subscribeAction('fire', fire);
    input.subscribeAction('reload', reload);
    render(<MobileControls input={input} onPause={onPause} />);
    const movement = screen.getByTestId('mobile-movement');
    mockMovementBounds(movement);

    fireEvent.pointerDown(movement, {
      button: 0,
      clientX: 84,
      clientY: 50,
      pointerId: 1,
    });
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Reload' }), {
      button: 0,
      pointerId: 2,
    });
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Jump' }), {
      button: 0,
      pointerId: 3,
    });
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Pause' }), {
      button: 0,
      pointerId: 4,
    });

    expect(screen.queryByRole('button', { name: 'Fire' })).not.toBeInTheDocument();
    expect(fire).not.toHaveBeenCalled();
    expect(reload).toHaveBeenCalledOnce();
    expect(input.hasJumpRequest()).toBe(false);
    expect(input.consumeLook()).toEqual([0, 0]);
    expect(onPause).toHaveBeenCalledOnce();
  });

  it('clears held and queued input on unmount', () => {
    const input = createTouchInputState();
    const { unmount } = render(<MobileControls input={input} onPause={vi.fn()} />);
    const movement = screen.getByTestId('mobile-movement');
    mockMovementBounds(movement);
    fireEvent.pointerDown(movement, { button: 0, clientX: 84, clientY: 50, pointerId: 1 });
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Jump' }), {
      button: 0,
      pointerId: 2,
    });
    expect(input.movement()[0]).toBeCloseTo(1);
    expect(input.hasJumpRequest()).toBe(true);

    unmount();

    expect(input.movement()).toEqual([0, 0]);
    expect(input.hasJumpRequest()).toBe(false);
  });
});
