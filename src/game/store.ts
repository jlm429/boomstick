import { create } from 'zustand';

export type AppPhase =
  | 'main-menu'
  | 'about'
  | 'controls'
  | 'arena-entry'
  | 'playing'
  | 'paused'
  | 'training-complete';

type AppState = {
  phase: AppPhase;
  hasPointerLock: boolean;
  pointerLockError: string | null;
  runId: number;
  startGame: () => void;
  showAbout: () => void;
  showControls: () => void;
  showMainMenu: () => void;
  preparePointerLockRequest: () => void;
  completeTraining: () => void;
  restart: () => void;
  handlePointerLockChange: (hasPointerLock: boolean) => void;
  handlePointerLockError: () => void;
};

export const isArenaPhase = (phase: AppPhase) =>
  phase === 'arena-entry' ||
  phase === 'playing' ||
  phase === 'paused' ||
  phase === 'training-complete';

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
  showControls: () => set({ phase: 'controls', hasPointerLock: false, pointerLockError: null }),
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
  completeTraining: () =>
    set((state) =>
      state.phase === 'playing'
        ? {
            phase: 'training-complete',
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
      if (state.phase === 'training-complete') {
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
