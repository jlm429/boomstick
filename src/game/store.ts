import { create } from 'zustand';

export type Screen = 'main' | 'about' | 'game';

type AppState = {
  screen: Screen;
  isPaused: boolean;
  hasPointerLock: boolean;
  runId: number;
  startGame: () => void;
  showAbout: () => void;
  showMainMenu: () => void;
  pause: () => void;
  resume: () => void;
  restart: () => void;
  setPointerLock: (hasPointerLock: boolean) => void;
};

export const useAppStore = create<AppState>((set) => ({
  screen: 'main',
  isPaused: false,
  hasPointerLock: false,
  runId: 0,
  startGame: () =>
    set((state) => ({ screen: 'game', isPaused: false, runId: state.runId + 1 })),
  showAbout: () => set({ screen: 'about', isPaused: false }),
  showMainMenu: () => set({ screen: 'main', isPaused: false, hasPointerLock: false }),
  pause: () => set((state) => (state.screen === 'game' ? { isPaused: true } : state)),
  resume: () => set({ isPaused: false }),
  restart: () => set((state) => ({ isPaused: false, runId: state.runId + 1 })),
  setPointerLock: (hasPointerLock) => set({ hasPointerLock }),
}));
