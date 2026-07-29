import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createEncounterState,
  encounterCountdownValue,
  type EncounterState,
} from './game/encounter';
import { createTouchInputState } from './game/input';
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
import { MobileControls } from './ui/MobileControls';
import { useTouchControls } from './ui/useTouchControls';

export function App() {
  const arenaCanvas = useRef<HTMLCanvasElement | null>(null);
  const [invertY, setInvertY] = useState(readInvertYSetting);
  const [weaponState, setWeaponState] = useState<WeaponState>(INITIAL_WEAPON_STATE);
  const [emptyFirePulse, setEmptyFirePulse] = useState(0);
  const [encounterState, setEncounterState] = useState<EncounterState>(createEncounterState);
  const [touchInput] = useState(createTouchInputState);
  const touchControls = useTouchControls();
  const {
    phase,
    controlMode,
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
    beginTouchPlay,
    pauseTouchPlay,
    completeTraining,
    applyDamage,
    finishDying,
    restart,
    handlePointerLockChange,
    handlePointerLockError,
  } = useAppStore();
  const gameplayActive = canPlayerAct({ phase, controlMode, hasPointerLock, lifeState });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const state = useAppStore.getState();
      if (
        event.code !== 'Escape' ||
        state.phase !== 'playing' ||
        state.controlMode !== 'desktop'
      )
        return;
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
    if (!gameplayActive) touchInput.clear();
  }, [gameplayActive, touchInput]);

  useEffect(() => {
    if (controlMode === 'touch' && !touchControls) pauseTouchPlay();
  }, [controlMode, pauseTouchPlay, touchControls]);

  useEffect(() => () => touchInput.clear(), [touchInput]);

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

  const restartAndResume = useCallback(() => {
    touchInput.clear();
    setEncounterState(createEncounterState());
    setWeaponState(INITIAL_WEAPON_STATE);
    setEmptyFirePulse(0);
    restart();
    if (touchControls) {
      beginTouchPlay();
      return;
    }
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
  }, [beginTouchPlay, handlePointerLockError, restart, touchControls, touchInput]);

  const enterOrResumeArena = useCallback(() => {
    touchInput.clear();
    if (touchControls) {
      beginTouchPlay();
      return;
    }
    requestArenaLock();
  }, [beginTouchPlay, requestArenaLock, touchControls, touchInput]);

  const startTraining = useCallback(() => {
    setEncounterState(createEncounterState());
    setWeaponState(INITIAL_WEAPON_STATE);
    setEmptyFirePulse(0);
    startGame();
  }, [startGame]);

  const returnToMainMenu = () => {
    document.exitPointerLock?.();
    touchInput.clear();
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
    return (
      <Controls
        invertY={invertY}
        touchControls={touchControls}
        onInvertYChange={updateInvertY}
        onBack={showMainMenu}
      />
    );
  }
  if (phase === 'main-menu') {
    return <MainMenu onPlay={startTraining} onAbout={showAbout} onControls={showControls} />;
  }

  const gameShellClassName = [
    'game-shell',
    touchControls && 'has-touch-controls',
    touchControls && gameplayActive && 'touch-gameplay-active',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <main className={gameShellClassName}>
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
        touchInput={touchInput}
      />
      {phase !== 'training-complete' && phase !== 'defeated' && (
        <GameHud
          damageRevision={damageRevision}
          emptyFirePulse={emptyFirePulse}
          encounterCountdown={encounterCountdownValue(encounterState)}
          health={health}
          lifeState={lifeState}
          playing={gameplayActive}
          touchControls={touchControls}
          weaponState={weaponState}
        />
      )}
      {touchControls && controlMode === 'touch' && gameplayActive && (
        <MobileControls input={touchInput} onPause={pauseTouchPlay} />
      )}
      {phase === 'arena-entry' && (
        <EntryPrompt
          error={pointerLockError}
          touchControls={touchControls}
          onEnter={enterOrResumeArena}
        />
      )}
      {phase === 'paused' && (
        <PauseMenu
          error={pointerLockError}
          onResume={enterOrResumeArena}
          onRestart={restartAndResume}
          onMainMenu={returnToMainMenu}
        />
      )}
      {phase === 'training-complete' && <TrainingComplete onRestart={restartAndResume} />}
      <DefeatOverlay
        lifeState={lifeState}
        onRetry={restartAndResume}
        onMainMenu={returnToMainMenu}
      />
    </main>
  );
}
