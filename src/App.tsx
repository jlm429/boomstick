import { useCallback, useEffect, useRef, useState } from 'react';
import { readInvertYSetting, writeInvertYSetting } from './game/settings';
import { INITIAL_WEAPON_STATE, type WeaponState } from './game/shooting';
import { useAppStore } from './game/store';
import { GameViewport } from './scene/GameViewport';
import { reportRuntimeDiagnostics } from './scene/runtimeDiagnostics';
import { EntryPrompt, GameHud, PauseMenu } from './ui/GameOverlay';
import { About, Controls, MainMenu } from './ui/Menu';

export function App() {
  const arenaCanvas = useRef<HTMLCanvasElement | null>(null);
  const [invertY, setInvertY] = useState(readInvertYSetting);
  const [weaponState, setWeaponState] = useState<WeaponState>(INITIAL_WEAPON_STATE);
  const [emptyFirePulse, setEmptyFirePulse] = useState(0);
  const {
    phase,
    hasPointerLock,
    pointerLockError,
    runId,
    startGame,
    showAbout,
    showControls,
    showMainMenu,
    preparePointerLockRequest,
    restart,
    handlePointerLockChange,
    handlePointerLockError,
  } = useAppStore();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Escape' || useAppStore.getState().phase !== 'playing') return;
      event.preventDefault();
      document.exitPointerLock?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const syncPointerLock = () => {
      handlePointerLockChange(document.pointerLockElement === arenaCanvas.current);
    };
    document.addEventListener('pointerlockchange', syncPointerLock);
    document.addEventListener('pointerlockerror', handlePointerLockError);
    return () => {
      document.removeEventListener('pointerlockchange', syncPointerLock);
      document.removeEventListener('pointerlockerror', handlePointerLockError);
    };
  }, [handlePointerLockChange, handlePointerLockError]);

  useEffect(() => {
    reportRuntimeDiagnostics({ phase, pointerLock: hasPointerLock });
  }, [hasPointerLock, phase]);

  const setArenaCanvas = useCallback((canvas: HTMLCanvasElement | null) => {
    arenaCanvas.current = canvas;
  }, []);

  const reinforceReloadReminder = useCallback(() => {
    setEmptyFirePulse((pulse) => pulse + 1);
  }, []);

  const requestArenaLock = useCallback(() => {
    preparePointerLockRequest();
    const canvas = arenaCanvas.current;
    if (!canvas?.requestPointerLock) {
      handlePointerLockError();
      return;
    }
    try {
      const lockRequest = canvas.requestPointerLock();
      if (lockRequest) void lockRequest.catch(handlePointerLockError);
    } catch {
      handlePointerLockError();
    }
  }, [handlePointerLockError, preparePointerLockRequest]);

  const restartAndRequestArenaLock = useCallback(() => {
    restart();
    const canvas = arenaCanvas.current;
    if (!canvas?.requestPointerLock) {
      handlePointerLockError();
      return;
    }
    try {
      const lockRequest = canvas.requestPointerLock();
      if (lockRequest) void lockRequest.catch(handlePointerLockError);
    } catch {
      handlePointerLockError();
    }
  }, [handlePointerLockError, restart]);

  const returnToMainMenu = () => {
    document.exitPointerLock?.();
    showMainMenu();
  };

  const updateInvertY = (value: boolean) => {
    writeInvertYSetting(value);
    setInvertY(value);
  };

  if (phase === 'about') return <About onBack={showMainMenu} />;
  if (phase === 'controls') {
    return <Controls invertY={invertY} onInvertYChange={updateInvertY} onBack={showMainMenu} />;
  }
  if (phase === 'main-menu') {
    return <MainMenu onPlay={startGame} onAbout={showAbout} onControls={showControls} />;
  }

  return (
    <main className="game-shell">
      <GameViewport
        active={phase === 'playing'}
        invertY={invertY}
        runId={runId}
        onCanvasReady={setArenaCanvas}
        onEmptyFire={reinforceReloadReminder}
        onWeaponStateChange={setWeaponState}
      />
      <GameHud
        emptyFirePulse={emptyFirePulse}
        playing={phase === 'playing'}
        weaponState={weaponState}
      />
      {phase === 'arena-entry' && (
        <EntryPrompt error={pointerLockError} onEnter={requestArenaLock} />
      )}
      {phase === 'paused' && (
        <PauseMenu
          error={pointerLockError}
          onResume={requestArenaLock}
          onRestart={restartAndRequestArenaLock}
          onMainMenu={returnToMainMenu}
        />
      )}
    </main>
  );
}
