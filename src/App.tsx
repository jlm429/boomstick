import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createEncounterState,
  encounterCountdownValue,
  type EncounterState,
} from './game/encounter';
import { DEATH_SEQUENCE_MS } from './game/playerHealth';
import { readInvertYSetting, writeInvertYSetting } from './game/settings';
import { INITIAL_WEAPON_STATE, type WeaponState } from './game/shooting';
import { canPlayerAct, useAppStore } from './game/store';
import { GameViewport } from './scene/GameViewport';
import { reportRuntimeDiagnostics } from './scene/runtimeDiagnostics';
import {
  DefeatOverlay,
  EntryPrompt,
  GameHud,
  PauseMenu,
  TrainingComplete,
} from './ui/GameOverlay';
import { About, Controls, MainMenu } from './ui/Menu';

export function App() {
  const arenaCanvas = useRef<HTMLCanvasElement | null>(null);
  const [invertY, setInvertY] = useState(readInvertYSetting);
  const [weaponState, setWeaponState] = useState<WeaponState>(INITIAL_WEAPON_STATE);
  const [emptyFirePulse, setEmptyFirePulse] = useState(0);
  const [encounterState, setEncounterState] = useState<EncounterState>(createEncounterState);
  const {
    phase,
    hasPointerLock,
    pointerLockError,
    runId,
    health,
    lifeState,
    damageRevision,
    startGame,
    showAbout,
    showControls,
    showMainMenu,
    preparePointerLockRequest,
    completeTraining,
    applyDamage,
    finishDying,
    restart,
    handlePointerLockChange,
    handlePointerLockError,
  } = useAppStore();
  const gameplayActive = canPlayerAct({ phase, hasPointerLock, lifeState });

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

  useEffect(() => {
    if (lifeState === 'alive') return;
    if (document.pointerLockElement === arenaCanvas.current) document.exitPointerLock?.();
    if (lifeState !== 'dying') return;
    const deathSequenceTimer = window.setTimeout(finishDying, DEATH_SEQUENCE_MS);
    return () => window.clearTimeout(deathSequenceTimer);
  }, [finishDying, lifeState]);

  const setArenaCanvas = useCallback((canvas: HTMLCanvasElement | null) => {
    arenaCanvas.current = canvas;
  }, []);

  const reinforceReloadReminder = useCallback(() => {
    setEmptyFirePulse((pulse) => pulse + 1);
  }, []);

  const updateEncounterState = useCallback(
    (state: EncounterState) => {
      setEncounterState(state);
      if (state.phase !== 'complete') return;
      completeTraining();
      if (document.pointerLockElement === arenaCanvas.current) document.exitPointerLock?.();
    },
    [completeTraining],
  );

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
    setEncounterState(createEncounterState());
    setWeaponState(INITIAL_WEAPON_STATE);
    setEmptyFirePulse(0);
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

  const startTraining = useCallback(() => {
    setEncounterState(createEncounterState());
    setWeaponState(INITIAL_WEAPON_STATE);
    setEmptyFirePulse(0);
    startGame();
  }, [startGame]);

  const returnToMainMenu = () => {
    document.exitPointerLock?.();
    setEncounterState(createEncounterState());
    setWeaponState(INITIAL_WEAPON_STATE);
    setEmptyFirePulse(0);
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
    return <MainMenu onPlay={startTraining} onAbout={showAbout} onControls={showControls} />;
  }

  return (
    <main className="game-shell">
      <GameViewport
        active={gameplayActive}
        invertY={invertY}
        playerLifeState={lifeState}
        runId={runId}
        onCanvasReady={setArenaCanvas}
        onEncounterStateChange={updateEncounterState}
        onEmptyFire={reinforceReloadReminder}
        onPlayerDamage={applyDamage}
        onWeaponStateChange={setWeaponState}
      />
      {phase !== 'training-complete' && phase !== 'defeated' && (
        <GameHud
          damageRevision={damageRevision}
          emptyFirePulse={emptyFirePulse}
          encounterCountdown={encounterCountdownValue(encounterState)}
          health={health}
          lifeState={lifeState}
          playing={gameplayActive}
          weaponState={weaponState}
        />
      )}
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
      {phase === 'training-complete' && (
        <TrainingComplete onRestart={restartAndRequestArenaLock} />
      )}
      <DefeatOverlay
        lifeState={lifeState}
        onRetry={restartAndRequestArenaLock}
        onMainMenu={returnToMainMenu}
      />
    </main>
  );
}
