import { create } from 'zustand';

export type Screen = 'main' | 'about' | 'game';
export type GamePhase = 'entry' | 'playing' | 'paused';

type AppState = {
  screen: Screen;
  gamePhase: GamePhase;
  hasPointerLock: boolean;
  runId: number;
  startGame: () => void;
  showAbout: () => void;
  showMainMenu: () => void;
  pauseGame: () => void;
  prepareArenaEntry: () => void;
  restart: () => void;
  handlePointerLockChange: (hasPointerLock: boolean) => void;
};

export const useAppStore = create<AppState>((set) => ({
  screen: 'main',
  gamePhase: 'entry',
  hasPointerLock: false,
  runId: 0,
  startGame: () =>
    set((state) => ({
      screen: 'game',
      gamePhase: 'entry',
      hasPointerLock: false,
      runId: state.runId + 1,
    })),
  showAbout: () => set({ screen: 'about', gamePhase: 'entry', hasPointerLock: false }),
  showMainMenu: () => set({ screen: 'main', gamePhase: 'entry', hasPointerLock: false }),
  pauseGame: () =>
    set((state) =>
      state.screen === 'game' ? { gamePhase: 'paused', hasPointerLock: false } : state,
    ),
  prepareArenaEntry: () =>
    set((state) => (state.screen === 'game' ? { gamePhase: 'entry' } : state)),
  restart: () =>
    set((state) => ({ gamePhase: 'entry', hasPointerLock: false, runId: state.runId + 1 })),
  handlePointerLockChange: (hasPointerLock) =>
    set((state) => {
      if (state.screen !== 'game') return { hasPointerLock: false };
      if (hasPointerLock) return { hasPointerLock: true, gamePhase: 'playing' };
      return {
        hasPointerLock: false,
        gamePhase: state.gamePhase === 'playing' ? 'paused' : state.gamePhase,
      };
    }),
}));
