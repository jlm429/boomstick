import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createTouchInputState } from '../game/input';
import { MobileControls } from './MobileControls';

describe('MobileControls', () => {
  it('maps owned pointers to movement and look state', () => {
    const input = createTouchInputState();
    render(<MobileControls input={input} onPause={vi.fn()} />);
    const movement = screen.getByTestId('mobile-movement');
    vi.spyOn(movement, 'getBoundingClientRect').mockReturnValue({
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

  it('dispatches fire, reload, jump, and pause exactly once per pointer press', () => {
    const input = createTouchInputState();
    const onPause = vi.fn();
    const fire = vi.fn();
    const reload = vi.fn();
    input.subscribeAction('fire', fire);
    input.subscribeAction('reload', reload);
    render(<MobileControls input={input} onPause={onPause} />);

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Fire' }), {
      button: 0,
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

    expect(fire).toHaveBeenCalledOnce();
    expect(reload).toHaveBeenCalledOnce();
    expect(input.hasJumpRequest()).toBe(false);
    expect(onPause).toHaveBeenCalledOnce();
  });

  it('clears held and queued input on unmount', () => {
    const input = createTouchInputState();
    const { unmount } = render(<MobileControls input={input} onPause={vi.fn()} />);
    const movement = screen.getByTestId('mobile-movement');
    vi.spyOn(movement, 'getBoundingClientRect').mockReturnValue({
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
