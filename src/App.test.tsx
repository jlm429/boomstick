import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { useAppStore } from './game/store';

vi.mock('./scene/GameViewport', () => ({
  GameViewport: ({
    active,
    runId,
    onCanvasReady,
  }: {
    active: boolean;
    runId: number;
    onCanvasReady: (canvas: HTMLCanvasElement | null) => void;
  }) => (
    <canvas
      data-active={active}
      data-run-id={runId}
      data-testid="game-viewport"
      ref={onCanvasReady}
    />
  ),
}));

function setPointerLockElement(element: Element | null) {
  Object.defineProperty(document, 'pointerLockElement', {
    configurable: true,
    value: element,
  });
  fireEvent(document, new Event('pointerlockchange'));
}

describe('App navigation', () => {
  const requestPointerLock = vi.fn<() => Promise<void>>(() => Promise.resolve());

  beforeEach(() => {
    useAppStore.setState({
      phase: 'main-menu',
      hasPointerLock: false,
      pointerLockError: null,
      runId: 0,
    });
    Object.defineProperty(HTMLCanvasElement.prototype, 'requestPointerLock', {
      configurable: true,
      value: requestPointerLock,
    });
    Object.defineProperty(document, 'exitPointerLock', {
      configurable: true,
      value: vi.fn(() => setPointerLockElement(null)),
    });
    Object.defineProperty(document, 'pointerLockElement', {
      configurable: true,
      value: null,
    });
    requestPointerLock.mockClear();
  });

  it('navigates menu to About and back', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'About' }));
    expect(screen.getByRole('dialog', { name: 'About' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.getByRole('heading', { name: 'BOOMSTICK' })).toBeInTheDocument();
  });

  it('moves from menu to the complete arena entry step', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Enter Arena' }));
    expect(screen.getByText('Click to capture the mouse and begin.')).toBeInTheDocument();
    expect(screen.getByText('WASD')).toBeInTheDocument();
    expect(screen.getByText('Mouse')).toBeInTheDocument();
    expect(screen.getByText('Space')).toBeInTheDocument();
    expect(screen.getByText('Escape')).toBeInTheDocument();
    expect(screen.getByTestId('game-viewport')).toHaveAttribute('data-active', 'false');
  });

  it('requests lock from the R3F canvas and only plays after pointerlockchange', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Enter Arena' }));
    const canvas = screen.getByTestId('game-viewport');
    fireEvent.click(screen.getByRole('button', { name: 'Enter Arena' }));
    expect(requestPointerLock).toHaveBeenCalledOnce();
    expect(canvas).toHaveAttribute('data-active', 'false');
    act(() => setPointerLockElement(canvas));
    expect(canvas).toHaveAttribute('data-active', 'true');
    expect(useAppStore.getState().phase).toBe('playing');
  });

  it('pauses on pointer-lock loss and resumes only after an explicit click and new lock', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Enter Arena' }));
    const canvas = screen.getByTestId('game-viewport');
    act(() => setPointerLockElement(canvas));
    act(() => setPointerLockElement(null));
    expect(screen.getByRole('dialog', { name: 'Catch your breath.' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
    expect(requestPointerLock).toHaveBeenCalledOnce();
    expect(screen.getByRole('dialog', { name: 'Catch your breath.' })).toBeInTheDocument();
    expect(canvas).toHaveAttribute('data-active', 'false');
    act(() => setPointerLockElement(canvas));
    expect(canvas).toHaveAttribute('data-active', 'true');
  });

  it('uses Escape to release lock and pause through the authoritative lock event', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Enter Arena' }));
    const canvas = screen.getByTestId('game-viewport');
    act(() => setPointerLockElement(canvas));
    fireEvent.keyDown(window, { code: 'Escape' });
    expect(document.exitPointerLock).toHaveBeenCalledOnce();
    expect(screen.getByRole('dialog', { name: 'Catch your breath.' })).toBeInTheDocument();
  });

  it('restarts at a new spawn run and requests lock from the restart click', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Enter Arena' }));
    const canvas = screen.getByTestId('game-viewport');
    act(() => setPointerLockElement(canvas));
    act(() => setPointerLockElement(null));
    expect(canvas).toHaveAttribute('data-run-id', '1');
    fireEvent.click(screen.getByRole('button', { name: 'Restart' }));
    expect(canvas).toHaveAttribute('data-run-id', '2');
    expect(requestPointerLock).toHaveBeenCalledOnce();
  });

  it('returns to the main menu without stale play state', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Enter Arena' }));
    const canvas = screen.getByTestId('game-viewport');
    act(() => setPointerLockElement(canvas));
    act(() => setPointerLockElement(null));
    fireEvent.click(screen.getByRole('button', { name: 'Return to Main Menu' }));
    expect(screen.getByRole('heading', { name: 'BOOMSTICK' })).toBeInTheDocument();
    expect(useAppStore.getState()).toMatchObject({
      phase: 'main-menu',
      hasPointerLock: false,
    });
  });

  it('preserves the landing identity and concise controls', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'BOOMSTICK' })).toBeInTheDocument();
    expect(screen.getByText('by Pew Pew Labs')).toBeInTheDocument();
    expect(
      screen.getByText('Built for modern browsers. Inspired by the classics.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'About' })).not.toBeInTheDocument();
  });
});
