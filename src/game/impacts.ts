export type ImpactSound = 'light' | 'wall';

export type ShotImpactHandler = () => ImpactSound;

export type ArenaImpactState = Readonly<{
  brokenLightIds: ReadonlySet<string>;
}>;

export const createArenaImpactState = (): ArenaImpactState => ({
  brokenLightIds: new Set(),
});

export function hitBreakableLight(
  state: ArenaImpactState,
  lightId: string,
): Readonly<{ state: ArenaImpactState; sound: ImpactSound }> {
  if (state.brokenLightIds.has(lightId)) return { state, sound: 'wall' };

  return {
    state: { brokenLightIds: new Set([...state.brokenLightIds, lightId]) },
    sound: 'light',
  };
}

export function selectImpactSound(current: ImpactSound | null, next: ImpactSound): ImpactSound {
  return current === 'light' || next === 'light' ? 'light' : 'wall';
}

export function impactVolumeAtDistance(distance: number) {
  const safeDistance = Number.isFinite(distance) ? Math.max(0, distance) : 0;
  return Math.max(0.2, 1 - safeDistance / 50);
}
