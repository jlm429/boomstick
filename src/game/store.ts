import { create } from 'zustand';

export type AppPhase = 'main-menu' | 'about' | 'arena-entry' | 'playing' | 'paused';

type AppState = {
  phase: AppPhase;
  hasPointerLock: boolean;
  pointerLockError: string | null;
  runId: number;
  startGame: () => void;
  showAbout: () => void;
  showMainMenu: () => void;
  preparePointerLockRequest: () => void;
  restart: () => void;
  handlePointerLockChange: (hasPointerLock: boolean) => void;
  handlePointerLockError: () => void;
};

export const isArenaPhase = (phase: AppPhase) =>
  phase === 'arena-entry' || phase === 'playing' || phase === 'paused';

export const isValidAppState = ({
  phase,
  hasPointerLock,
}: Pick<AppState, 'phase' | 'hasPointerLock'>) =>
  (phase === 'playing' && hasPointerLock) || (phase !== 'playing' && !hasPointerLock);

export const useAppStore = create<AppState>((set) => ({
  phase: 'main-menu',
  hasPointerLock: false,
  pointerLockError: null,
  runId: 0,
  startGame: () =>
    set((state) => ({
      phase: 'arena-entry',
      hasPointerLock: false,
      pointerLockError: null,
      runId: state.runId + 1,
    })),
  showAbout: () => set({ phase: 'about', hasPointerLock: false, pointerLockError: null }),
  showMainMenu: () =>
    set({ phase: 'main-menu', hasPointerLock: false, pointerLockError: null }),
  preparePointerLockRequest: () =>
    set((state) =>
      isArenaPhase(state.phase)
        ? {
            phase: state.phase === 'playing' ? 'paused' : state.phase,
            hasPointerLock: false,
            pointerLockError: null,
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
          }
        : state,
    ),
  handlePointerLockChange: (hasPointerLock) =>
    set((state) => {
      if (!isArenaPhase(state.phase)) {
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
      isArenaPhase(state.phase)
        ? {
            phase: state.phase === 'arena-entry' ? 'arena-entry' : 'paused',
            hasPointerLock: false,
            pointerLockError: 'Mouse capture was not granted. Click Enter Arena to try again.',
          }
        : state,
    ),
}));
