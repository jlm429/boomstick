import { useEffect } from 'react';
import { useAppStore } from './game/store';
import { GameViewport } from './scene/GameViewport';
import { EntryPrompt, GameHud, PauseMenu } from './ui/GameOverlay';
import { About, MainMenu } from './ui/Menu';

export function App() {
  const {
    screen,
    gamePhase,
    hasPointerLock,
    runId,
    startGame,
    showAbout,
    showMainMenu,
    pauseGame,
    prepareArenaEntry,
    restart,
    handlePointerLockChange,
  } = useAppStore();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Escape' && screen === 'game' && gamePhase === 'playing') {
        event.preventDefault();
        document.exitPointerLock?.();
        pauseGame();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [gamePhase, pauseGame, screen]);

  useEffect(() => {
    const syncPointerLock = () => {
      const canvas = document.querySelector<HTMLCanvasElement>('.game-shell canvas');
      handlePointerLockChange(document.pointerLockElement === canvas);
    };
    document.addEventListener('pointerlockchange', syncPointerLock);
    return () => document.removeEventListener('pointerlockchange', syncPointerLock);
  }, [handlePointerLockChange]);

  if (screen === 'about') return <About onBack={showMainMenu} />;
  if (screen === 'main') return <MainMenu onPlay={startGame} onAbout={showAbout} />;

  const requestArenaEntry = () => {
    prepareArenaEntry();
    const canvas = document.querySelector<HTMLCanvasElement>('.game-shell canvas');
    if (!canvas?.requestPointerLock) return;
    void Promise.resolve(canvas.requestPointerLock()).catch(() => undefined);
  };
  const returnToMainMenu = () => {
    document.exitPointerLock?.();
    showMainMenu();
  };

  const isPlaying = gamePhase === 'playing' && hasPointerLock;
  return (
    <main className="game-shell">
      <GameViewport active={isPlaying} runId={runId} />
      <GameHud />
      {gamePhase === 'entry' && <EntryPrompt onEnter={requestArenaEntry} />}
      {gamePhase === 'paused' && (
        <PauseMenu
          onResume={requestArenaEntry}
          onRestart={() => {
            restart();
            requestArenaEntry();
          }}
          onMainMenu={returnToMainMenu}
        />
      )}
    </main>
  );
}
