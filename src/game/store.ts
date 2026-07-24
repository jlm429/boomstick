import { create } from 'zustand';
import { PLAYER_MAX_HEALTH, clampPlayerHealth, type PlayerLifeState } from './playerHealth';

export type AppPhase =
  | 'main-menu'
  | 'about'
  | 'controls'
  | 'arena-entry'
  | 'playing'
  | 'paused'
  | 'dying'
  | 'defeated'
  | 'training-complete';

type AppState = {
  phase: AppPhase;
  hasPointerLock: boolean;
  pointerLockError: string | null;
  runId: number;
  health: number;
  lifeState: PlayerLifeState;
  damageRevision: number;
  startGame: () => void;
  showAbout: () => void;
  showControls: () => void;
  showMainMenu: () => void;
  preparePointerLockRequest: () => void;
  completeTraining: () => void;
  applyDamage: (damage: number) => void;
  restoreHealth: (health: number) => void;
  resetHealth: () => void;
  finishDying: () => void;
  restart: () => void;
  handlePointerLockChange: (hasPointerLock: boolean) => void;
  handlePointerLockError: () => void;
};

export const isArenaPhase = (phase: AppPhase) =>
  phase === 'arena-entry' ||
  phase === 'playing' ||
  phase === 'paused' ||
  phase === 'dying' ||
  phase === 'defeated' ||
  phase === 'training-complete';

export const isValidAppState = ({
  phase,
  hasPointerLock,
}: Pick<AppState, 'phase' | 'hasPointerLock'>) =>
  (phase === 'playing' && hasPointerLock) || (phase !== 'playing' && !hasPointerLock);

export const canPlayerAct = ({
  phase,
  hasPointerLock,
  lifeState,
}: Pick<AppState, 'phase' | 'hasPointerLock' | 'lifeState'>) =>
  phase === 'playing' && hasPointerLock && lifeState === 'alive';

const freshPlayerState = {
  health: PLAYER_MAX_HEALTH,
  lifeState: 'alive' as const,
  damageRevision: 0,
};

export const useAppStore = create<AppState>((set) => ({
  phase: 'main-menu',
  hasPointerLock: false,
  pointerLockError: null,
  runId: 0,
  ...freshPlayerState,
  startGame: () =>
    set((state) => ({
      phase: 'arena-entry',
      hasPointerLock: false,
      pointerLockError: null,
      runId: state.runId + 1,
      ...freshPlayerState,
    })),
  showAbout: () =>
    set({ phase: 'about', hasPointerLock: false, pointerLockError: null, ...freshPlayerState }),
  showControls: () =>
    set({
      phase: 'controls',
      hasPointerLock: false,
      pointerLockError: null,
      ...freshPlayerState,
    }),
  showMainMenu: () =>
    set({
      phase: 'main-menu',
      hasPointerLock: false,
      pointerLockError: null,
      ...freshPlayerState,
    }),
  preparePointerLockRequest: () =>
    set((state) =>
      isArenaPhase(state.phase) && state.lifeState === 'alive'
        ? {
            phase: state.phase === 'playing' ? 'paused' : state.phase,
            hasPointerLock: false,
            pointerLockError: null,
          }
        : state,
    ),
  completeTraining: () =>
    set((state) =>
      state.phase === 'playing' && state.lifeState === 'alive'
        ? {
            phase: 'training-complete',
            hasPointerLock: false,
            pointerLockError: null,
          }
        : state,
    ),
  applyDamage: (damage) =>
    set((state) => {
      if (state.lifeState !== 'alive' || !Number.isFinite(damage) || damage <= 0) return state;
      const health = clampPlayerHealth(state.health - damage);
      if (health === state.health) return state;
      if (health > 0) {
        return {
          health,
          damageRevision: state.damageRevision + 1,
        };
      }
      return {
        health: 0,
        lifeState: 'dying',
        damageRevision: state.damageRevision + 1,
        phase: isArenaPhase(state.phase) ? 'dying' : state.phase,
        hasPointerLock: false,
        pointerLockError: null,
      };
    }),
  restoreHealth: (health) =>
    set((state) => {
      if (state.lifeState !== 'alive' || !Number.isFinite(health) || health <= 0) return state;
      const restoredHealth = clampPlayerHealth(state.health + health);
      return restoredHealth === state.health ? state : { health: restoredHealth };
    }),
  resetHealth: () => set(freshPlayerState),
  finishDying: () =>
    set((state) =>
      state.lifeState === 'dying'
        ? {
            lifeState: 'dead',
            phase: isArenaPhase(state.phase) ? 'defeated' : state.phase,
            hasPointerLock: false,
          }
        : state,
    ),
  restart: () =>
    set((state) =>
      isArenaPhase(state.phase)
        ? {
            phase: 'arena-entry',
            hasPointerLock: false,
            pointerLockError: null,
            runId: state.runId + 1,
            ...freshPlayerState,
          }
        : state,
    ),
  handlePointerLockChange: (hasPointerLock) =>
    set((state) => {
      if (!isArenaPhase(state.phase)) {
        return { hasPointerLock: false };
      }
      if (state.phase === 'training-complete' || state.lifeState !== 'alive') {
        return { hasPointerLock: false };
      }
      if (hasPointerLock) {
        return { phase: 'playing', hasPointerLock: true, pointerLockError: null };
      }
      return {
        phase: state.phase === 'playing' ? 'paused' : state.phase,
        hasPointerLock: false,
      };
    }),
  handlePointerLockError: () =>
    set((state) =>
      isArenaPhase(state.phase) && state.lifeState === 'alive'
        ? {
            phase: state.phase === 'arena-entry' ? 'arena-entry' : 'paused',
            hasPointerLock: false,
            pointerLockError: 'Mouse capture was not granted. Click Enter Arena to try again.',
          }
        : state,
    ),
}));
