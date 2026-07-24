import { beforeEach, describe, expect, it } from 'vitest';
import { PLAYER_MAX_HEALTH } from './playerHealth';
import { canPlayerAct, isValidAppState, useAppStore } from './store';

describe('application state', () => {
  beforeEach(() => {
    useAppStore.setState({
      phase: 'main-menu',
      hasPointerLock: false,
      pointerLockError: null,
      runId: 0,
      health: PLAYER_MAX_HEALTH,
      lifeState: 'alive',
      damageRevision: 0,
    });
  });

  it('follows the authoritative menu, entry, play, pause, resume, menu flow', () => {
    useAppStore.getState().startGame();
    expect(useAppStore.getState().phase).toBe('arena-entry');
    useAppStore.getState().handlePointerLockChange(true);
    expect(useAppStore.getState()).toMatchObject({ phase: 'playing', hasPointerLock: true });
    useAppStore.getState().handlePointerLockChange(false);
    expect(useAppStore.getState()).toMatchObject({ phase: 'paused', hasPointerLock: false });
    useAppStore.getState().preparePointerLockRequest();
    expect(useAppStore.getState().phase).toBe('paused');
    useAppStore.getState().handlePointerLockChange(true);
    expect(useAppStore.getState()).toMatchObject({ phase: 'playing', hasPointerLock: true });
    useAppStore.getState().showMainMenu();
    expect(useAppStore.getState()).toMatchObject({ phase: 'main-menu', hasPointerLock: false });
  });

  it('never enables playing without pointer lock or retains lock outside playing', () => {
    expect(isValidAppState({ phase: 'playing', hasPointerLock: false })).toBe(false);
    expect(isValidAppState({ phase: 'paused', hasPointerLock: true })).toBe(false);
    const assertInvariant = () => expect(isValidAppState(useAppStore.getState())).toBe(true);
    assertInvariant();
    useAppStore.getState().startGame();
    assertInvariant();
    useAppStore.getState().handlePointerLockChange(true);
    assertInvariant();
    useAppStore.getState().handlePointerLockChange(false);
    assertInvariant();
    useAppStore.getState().restart();
    assertInvariant();
    useAppStore.getState().showAbout();
    assertInvariant();
    useAppStore.getState().showMainMenu();
    assertInvariant();
  });

  it('restarts a fresh run and preserves a safe entry state', () => {
    useAppStore.getState().startGame();
    useAppStore.getState().handlePointerLockChange(true);
    useAppStore.getState().applyDamage(45);
    useAppStore.getState().restart();
    expect(useAppStore.getState()).toMatchObject({
      runId: 2,
      phase: 'arena-entry',
      hasPointerLock: false,
      health: PLAYER_MAX_HEALTH,
      lifeState: 'alive',
    });
  });

  it('pauses at training completion, rejects stale lock events, and restarts cleanly', () => {
    useAppStore.getState().startGame();
    useAppStore.getState().handlePointerLockChange(true);
    useAppStore.getState().completeTraining();
    expect(useAppStore.getState()).toMatchObject({
      phase: 'training-complete',
      hasPointerLock: false,
      runId: 1,
    });
    expect(isValidAppState(useAppStore.getState())).toBe(true);

    useAppStore.getState().handlePointerLockChange(true);
    expect(useAppStore.getState().phase).toBe('training-complete');

    useAppStore.getState().restart();
    expect(useAppStore.getState()).toMatchObject({
      phase: 'arena-entry',
      hasPointerLock: false,
      runId: 2,
    });
  });

  it('keeps pointer-lock failure recoverable without inventing play state', () => {
    useAppStore.getState().startGame();
    useAppStore.getState().handlePointerLockError();
    expect(useAppStore.getState()).toMatchObject({
      phase: 'arena-entry',
      hasPointerLock: false,
      pointerLockError: expect.stringContaining('not granted'),
    });
    useAppStore.getState().handlePointerLockChange(true);
    useAppStore.getState().handlePointerLockChange(false);
    useAppStore.getState().handlePointerLockError();
    expect(useAppStore.getState().phase).toBe('paused');
  });

  it('starts at full health and clamps damage and restoration', () => {
    expect(useAppStore.getState().health).toBe(PLAYER_MAX_HEALTH);

    useAppStore.getState().applyDamage(35);
    expect(useAppStore.getState().health).toBe(65);
    useAppStore.getState().restoreHealth(200);
    expect(useAppStore.getState().health).toBe(PLAYER_MAX_HEALTH);

    useAppStore.getState().applyDamage(140);
    expect(useAppStore.getState().health).toBe(0);
    useAppStore.getState().restoreHealth(20);
    expect(useAppStore.getState().health).toBe(0);
  });

  it('enters dying exactly once, disables actions, and reaches dead', () => {
    useAppStore.getState().startGame();
    useAppStore.getState().handlePointerLockChange(true);
    expect(canPlayerAct(useAppStore.getState())).toBe(true);

    let dyingTransitions = 0;
    let previousLifeState = useAppStore.getState().lifeState;
    const unsubscribe = useAppStore.subscribe((state) => {
      if (previousLifeState !== 'dying' && state.lifeState === 'dying') dyingTransitions += 1;
      previousLifeState = state.lifeState;
    });

    useAppStore.getState().applyDamage(PLAYER_MAX_HEALTH);
    useAppStore.getState().applyDamage(5);
    expect(useAppStore.getState()).toMatchObject({
      health: 0,
      lifeState: 'dying',
      phase: 'dying',
      hasPointerLock: false,
    });
    expect(dyingTransitions).toBe(1);
    expect(canPlayerAct(useAppStore.getState())).toBe(false);

    useAppStore.getState().finishDying();
    useAppStore.getState().finishDying();
    expect(useAppStore.getState()).toMatchObject({
      lifeState: 'dead',
      phase: 'defeated',
      health: 0,
    });
    unsubscribe();
  });

  it('retry resets health, life state, and temporary damage state', () => {
    useAppStore.getState().startGame();
    useAppStore.getState().handlePointerLockChange(true);
    useAppStore.getState().applyDamage(PLAYER_MAX_HEALTH);
    useAppStore.getState().finishDying();
    const runId = useAppStore.getState().runId;

    useAppStore.getState().restart();

    expect(useAppStore.getState()).toMatchObject({
      health: PLAYER_MAX_HEALTH,
      lifeState: 'alive',
      damageRevision: 0,
      phase: 'arena-entry',
      runId: runId + 1,
    });
  });
});
