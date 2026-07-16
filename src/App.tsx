import { useEffect } from 'react';
import { useAppStore } from './game/store';
import { GameViewport } from './scene/GameViewport';
import { EntryPrompt, GameHud, PauseMenu } from './ui/GameOverlay';
import { About, MainMenu } from './ui/Menu';

export function App() {
  const {
    screen,
    isPaused,
    hasPointerLock,
    runId,
    startGame,
    showAbout,
    showMainMenu,
    pause,
    resume,
    restart,
    setPointerLock,
  } = useAppStore();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Escape' && screen === 'game' && !isPaused) {
        event.preventDefault();
        document.exitPointerLock?.();
        pause();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isPaused, pause, screen]);

  useEffect(() => {
    const syncPointerLock = () => setPointerLock(Boolean(document.pointerLockElement));
    document.addEventListener('pointerlockchange', syncPointerLock);
    return () => document.removeEventListener('pointerlockchange', syncPointerLock);
  }, [setPointerLock]);

  if (screen === 'about') return <About onBack={showMainMenu} />;
  if (screen === 'main') return <MainMenu onPlay={startGame} onAbout={showAbout} />;

  const resumeGame = () => {
    resume();
  };
  const enterArena = () => {
    void document
      .querySelector<HTMLCanvasElement>('.game-shell canvas')
      ?.requestPointerLock()
      .catch(() => undefined);
  };
  return (
    <main className="game-shell">
      <GameViewport active={!isPaused} runId={runId} />
      <GameHud />
      {!hasPointerLock && !isPaused && <EntryPrompt onEnter={enterArena} />}
      {isPaused && (
        <PauseMenu onResume={resumeGame} onRestart={restart} onMainMenu={showMainMenu} />
      )}
    </main>
  );
}
