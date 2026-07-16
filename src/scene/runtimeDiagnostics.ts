import type { AppPhase } from '../game/store';

export const DEVELOPMENT_DIAGNOSTICS = {
  enabled: import.meta.env.DEV,
  sampleIntervalSeconds: 1,
  showSceneHelpers: import.meta.env.DEV,
} as const;

export type RuntimeDiagnostics = {
  phase?: AppPhase;
  pointerLock?: boolean;
  canvas?: readonly [number, number];
  camera?: readonly [number, number, number];
  cameraRotation?: readonly [number, number, number];
  frame?: number;
  frameDelta?: number;
  sceneChildren?: number;
  drawCalls?: number;
  webglContext?: 'ok' | 'lost';
  physics?: 'waiting' | 'ready';
  player?: readonly [number, number, number];
  input?: readonly string[];
};

declare global {
  interface Window {
    __BOOMSTICK_DIAGNOSTICS__?: RuntimeDiagnostics;
  }
}

const diagnostics: RuntimeDiagnostics = { physics: 'waiting' };

export function reportRuntimeDiagnostics(patch: RuntimeDiagnostics) {
  if (!DEVELOPMENT_DIAGNOSTICS.enabled) return;
  Object.assign(diagnostics, patch);
  window.__BOOMSTICK_DIAGNOSTICS__ = diagnostics;
}
