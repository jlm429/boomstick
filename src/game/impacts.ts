import { BREAKABLE_LIGHT_MAX_DISTANCE } from './constants';

export type ImpactSound = 'light' | 'wall';

export type ShotImpactPoint = Readonly<{ x: number; y: number; z: number }>;

export type ShotImpact = Readonly<{
  distance: number;
  point: ShotImpactPoint;
}>;

export type ShotImpactHandler = (impact: ShotImpact) => ImpactSound | null;

export type ArenaImpactState = Readonly<{
  brokenLightIds: ReadonlySet<string>;
}>;

export const createArenaImpactState = (): ArenaImpactState => ({
  brokenLightIds: new Set(),
});

export function hitBreakableLight(
  state: ArenaImpactState,
  lightId: string,
  distance: number,
): Readonly<{ state: ArenaImpactState; sound: ImpactSound }> {
  if (
    state.brokenLightIds.has(lightId) ||
    !Number.isFinite(distance) ||
    distance < 0 ||
    distance > BREAKABLE_LIGHT_MAX_DISTANCE
  ) {
    return { state, sound: 'wall' };
  }

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
