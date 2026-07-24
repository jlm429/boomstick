import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { DEATH_SEQUENCE_MS } from './game/playerHealth';
import { useAppStore } from './game/store';

vi.mock('./scene/GameViewport', () => ({
  GameViewport: ({
    active,
    invertY,
    playerLifeState,
    runId,
    onCanvasReady,
    onEncounterStateChange,
    onPlayerDamage,
    onWeaponStateChange,
  }: {
    active: boolean;
    invertY: boolean;
    playerLifeState: 'alive' | 'dying' | 'dead';
    runId: number;
    onCanvasReady: (canvas: HTMLCanvasElement | null) => void;
    onEncounterStateChange: (state: {
      phase: 'training' | 'countdown' | 'zombie' | 'complete';
      elapsedSeconds?: number;
    }) => void;
    onPlayerDamage: (damage: number) => void;
    onWeaponStateChange: (state: { ammunition: number; isReloading: boolean }) => void;
  }) => (
    <>
      <canvas
        data-active={active}
        data-invert-y={invertY}
        data-life-state={playerLifeState}
        data-run-id={runId}
        data-testid="game-viewport"
        ref={onCanvasReady}
      />
      <button data-testid="damage-player" hidden onClick={() => onPlayerDamage(5)} />
      <button
        data-testid="complete-training"
        hidden
        onClick={() => onEncounterStateChange({ phase: 'countdown', elapsedSeconds: 0 })}
      />
      <button
        data-testid="start-zombie"
        hidden
        onClick={() => onEncounterStateChange({ phase: 'zombie' })}
      />
      <button
        data-testid="remove-zombie"
        hidden
        onClick={() => onEncounterStateChange({ phase: 'complete' })}
      />
      <button
        data-testid="empty-weapon"
        hidden
        onClick={() => onWeaponStateChange({ ammunition: 0, isReloading: false })}
      />
    </>
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
      health: 100,
      lifeState: 'alive',
      damageRevision: 0,
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

  afterEach(() => vi.useRealTimers());

  it('navigates menu to About and back', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'About' }));
    expect(screen.getByRole('dialog', { name: 'About' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.getByRole('heading', { name: 'BOOMSTICK' })).toBeInTheDocument();
  });

  it('updates and persists the vertical mouse-look setting before entering the arena', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Controls' }));
    expect(screen.getByText('R')).toBeInTheDocument();
    expect(screen.getByText('Reload')).toBeInTheDocument();
    const checkbox = screen.getByRole('checkbox', { name: 'Invert Y' });
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(localStorage.getItem('boomstick.invert-y')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enter Arena' }));
    expect(screen.getByTestId('game-viewport')).toHaveAttribute('data-invert-y', 'true');
  });

  it('moves from menu to the complete arena entry step', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Enter Arena' }));
    expect(screen.getByText('Click to capture the mouse and begin.')).toBeInTheDocument();
    expect(screen.getByText('WASD')).toBeInTheDocument();
    expect(screen.getByText('Mouse')).toBeInTheDocument();
    expect(screen.getByText('Space')).toBeInTheDocument();
    expect(screen.getByText('Escape')).toBeInTheDocument();
    expect(screen.getByText('R')).toBeInTheDocument();
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

  it('clears the countdown and remounts a fresh encounter on Restart', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Enter Arena' }));
    const canvas = screen.getByTestId('game-viewport');
    act(() => setPointerLockElement(canvas));
    fireEvent.click(screen.getByTestId('complete-training'));
    expect(
      screen.getByRole('status', { name: 'Zombie encounter begins in 3' }),
    ).toBeInTheDocument();

    act(() => setPointerLockElement(null));
    fireEvent.click(screen.getByRole('button', { name: 'Restart' }));

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(canvas).toHaveAttribute('data-run-id', '2');
  });

  it('shows completion only after zombie removal, pauses play, and hides the HUD', () => {
    const { container } = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Enter Arena' }));
    const canvas = screen.getByTestId('game-viewport');
    act(() => setPointerLockElement(canvas));

    fireEvent.click(screen.getByTestId('start-zombie'));
    expect(screen.queryByRole('dialog', { name: 'Training Complete' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('remove-zombie'));
    expect(screen.getByRole('dialog', { name: 'Training Complete' })).toBeInTheDocument();
    expect(screen.queryByText('You have completed training.')).not.toBeInTheDocument();
    expect(screen.getByText('Level 1 coming soon...')).toBeInTheDocument();
    expect(canvas).toHaveAttribute('data-active', 'false');
    expect(container.querySelector('.hud')).not.toBeInTheDocument();
    expect(document.exitPointerLock).toHaveBeenCalledOnce();
    expect(useAppStore.getState()).toMatchObject({
      phase: 'training-complete',
      hasPointerLock: false,
    });
  });

  it('restarts the completed encounter from a fully fresh training run', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Enter Arena' }));
    const canvas = screen.getByTestId('game-viewport');
    act(() => setPointerLockElement(canvas));
    fireEvent.click(screen.getByTestId('complete-training'));
    fireEvent.click(screen.getByTestId('empty-weapon'));
    fireEvent.click(screen.getByTestId('start-zombie'));
    fireEvent.click(screen.getByTestId('remove-zombie'));

    fireEvent.click(screen.getByRole('button', { name: 'Restart Training' }));

    expect(screen.queryByRole('dialog', { name: 'Training Complete' })).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByText('10 / 10')).toBeInTheDocument();
    expect(canvas).toHaveAttribute('data-run-id', '2');
    expect(canvas).toHaveAttribute('data-active', 'false');
    expect(requestPointerLock).toHaveBeenCalledOnce();

    act(() => setPointerLockElement(canvas));
    expect(canvas).toHaveAttribute('data-active', 'true');
    expect(useAppStore.getState().phase).toBe('playing');
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

  it('shows critical health only at five or lower and clears it on restart', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Enter Arena' }));
    const canvas = screen.getByTestId('game-viewport');
    act(() => setPointerLockElement(canvas));

    act(() => useAppStore.getState().applyDamage(94));
    expect(screen.queryByTestId('critical-health-effect')).not.toBeInTheDocument();
    act(() => useAppStore.getState().applyDamage(1));
    expect(screen.getByTestId('critical-health-effect')).toBeInTheDocument();

    act(() => setPointerLockElement(null));
    fireEvent.click(screen.getByRole('button', { name: 'Restart' }));
    expect(screen.queryByTestId('critical-health-effect')).not.toBeInTheDocument();
    expect(screen.getByTestId('health-module')).toHaveTextContent('100');
    expect(useAppStore.getState()).toMatchObject({ health: 100, lifeState: 'alive' });
  });

  it('disables gameplay during death, reaches defeat, and retries cleanly', () => {
    vi.useFakeTimers();
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Enter Arena' }));
    const canvas = screen.getByTestId('game-viewport');
    act(() => setPointerLockElement(canvas));

    act(() => useAppStore.getState().applyDamage(100));
    expect(canvas).toHaveAttribute('data-active', 'false');
    expect(canvas).toHaveAttribute('data-life-state', 'dying');
    expect(screen.getByTestId('death-fade')).toBeInTheDocument();
    expect(screen.queryByTestId('critical-health-effect')).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(DEATH_SEQUENCE_MS));
    expect(screen.getByRole('dialog', { name: 'You Went Down' })).toBeInTheDocument();
    expect(canvas).toHaveAttribute('data-life-state', 'dead');

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(screen.queryByRole('dialog', { name: 'You Went Down' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('death-fade')).not.toBeInTheDocument();
    expect(screen.queryByTestId('health-damage-pulse')).not.toBeInTheDocument();
    expect(canvas).toHaveAttribute('data-life-state', 'alive');
    expect(canvas).toHaveAttribute('data-run-id', '2');
    expect(useAppStore.getState()).toMatchObject({
      health: 100,
      lifeState: 'alive',
      damageRevision: 0,
      phase: 'arena-entry',
    });
  });

  it('preserves the landing identity and concise controls', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'BOOMSTICK' })).toBeInTheDocument();
    expect(screen.getByText('by Pew Pew Labs')).toBeInTheDocument();
    expect(
      screen.queryByText('Built for modern browsers. Inspired by the classics.'),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'About' })).not.toBeInTheDocument();
  });
});
