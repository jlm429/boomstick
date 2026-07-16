import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from './store';

describe('application state', () => {
  beforeEach(() => {
    useAppStore.setState({
      screen: 'main',
      gamePhase: 'entry',
      hasPointerLock: false,
      runId: 0,
    });
  });

  it('only enables play after pointer lock is acquired', () => {
    const state = useAppStore.getState();
    state.startGame();
    expect(useAppStore.getState()).toMatchObject({
      screen: 'game',
      gamePhase: 'entry',
      runId: 1,
    });
    useAppStore.getState().handlePointerLockChange(true);
    expect(useAppStore.getState()).toMatchObject({
      gamePhase: 'playing',
      hasPointerLock: true,
    });
  });

  it('pauses when pointer lock is lost and resumes only after a new lock', () => {
    useAppStore.getState().startGame();
    useAppStore.getState().handlePointerLockChange(true);
    useAppStore.getState().handlePointerLockChange(false);
    expect(useAppStore.getState()).toMatchObject({
      gamePhase: 'paused',
      hasPointerLock: false,
    });
    useAppStore.getState().prepareArenaEntry();
    expect(useAppStore.getState().gamePhase).toBe('entry');
    useAppStore.getState().handlePointerLockChange(true);
    expect(useAppStore.getState()).toMatchObject({
      gamePhase: 'playing',
      hasPointerLock: true,
    });
  });

  it('restarts a fresh spawn run and can return home without stale lock state', () => {
    useAppStore.getState().startGame();
    useAppStore.getState().handlePointerLockChange(true);
    useAppStore.getState().restart();
    expect(useAppStore.getState()).toMatchObject({
      runId: 2,
      gamePhase: 'entry',
      hasPointerLock: false,
    });
    useAppStore.getState().showMainMenu();
    expect(useAppStore.getState()).toMatchObject({
      screen: 'main',
      gamePhase: 'entry',
      hasPointerLock: false,
    });
  });
});
