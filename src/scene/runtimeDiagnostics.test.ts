import { describe, expect, it } from 'vitest';
import { DEVELOPMENT_DIAGNOSTICS } from './runtimeDiagnostics';

describe('development diagnostics', () => {
  it('keeps quiet runtime diagnostics and scene helpers development-only', () => {
    expect(DEVELOPMENT_DIAGNOSTICS.enabled).toBe(import.meta.env.DEV);
    expect(DEVELOPMENT_DIAGNOSTICS.showSceneHelpers).toBe(import.meta.env.DEV);
    expect(DEVELOPMENT_DIAGNOSTICS.sampleIntervalSeconds).toBeGreaterThanOrEqual(1);
  });
});
