import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from './store';

describe('application state', () => {
  beforeEach(() => {
    useAppStore.setState({ screen: 'main', isPaused: false, hasPointerLock: false, runId: 0 });
  });

  it('moves through the game and pause flow', () => {
    const state = useAppStore.getState();
    state.startGame();
    expect(useAppStore.getState()).toMatchObject({ screen: 'game', isPaused: false, runId: 1 });
    useAppStore.getState().pause();
    expect(useAppStore.getState().isPaused).toBe(true);
    useAppStore.getState().resume();
    expect(useAppStore.getState().isPaused).toBe(false);
  });

  it('restarts a new arena run and can return home', () => {
    useAppStore.getState().startGame();
    useAppStore.getState().restart();
    expect(useAppStore.getState().runId).toBe(2);
    useAppStore.getState().showMainMenu();
    expect(useAppStore.getState()).toMatchObject({ screen: 'main', isPaused: false });
  });
});
