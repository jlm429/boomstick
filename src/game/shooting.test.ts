import { describe, expect, it } from 'vitest';
import {
  SHOT_COOLDOWN_SECONDS,
  SHOT_PELLET_COUNT,
  INITIAL_WEAPON_STATE,
  MAGAZINE_CAPACITY,
  RELOAD_PHASE_TIMINGS,
  RELOAD_SECONDS,
  canFireShot,
  canFireWeapon,
  completeReload,
  consumeRound,
  firstShotTarget,
  isReloadInput,
  pelletOffsets,
  reloadPoseAt,
  startReload,
} from './shooting';

describe('shotgun firing rules', () => {
  it('enforces a short cooldown between shots', () => {
    expect(canFireShot(-Infinity, 0)).toBe(true);
    expect(canFireShot(1, 1 + SHOT_COOLDOWN_SECONDS - 0.001)).toBe(false);
    expect(canFireShot(1, 1 + SHOT_COOLDOWN_SECONDS)).toBe(true);
  });

  it('uses a centered, deterministic multi-pellet spread', () => {
    const offsets = pelletOffsets();
    expect(offsets).toHaveLength(SHOT_PELLET_COUNT);
    expect(offsets[0]).toEqual([0, 0]);
    expect(offsets.some(([horizontal, vertical]) => horizontal !== 0 || vertical !== 0)).toBe(
      true,
    );
  });

  it('only reacts to the nearest shot collision', () => {
    expect(firstShotTarget([{ target: null }, { target: 'covered-target' }])).toBeNull();
    expect(firstShotTarget([{ target: 'visible-target' }, { target: null }])).toBe(
      'visible-target',
    );
  });

  it('keeps the visual firing pass separate from hitscan mechanics', () => {
    expect(SHOT_PELLET_COUNT).toBe(9);
    expect(SHOT_COOLDOWN_SECONDS).toBe(0.32);
    expect(pelletOffsets()).toHaveLength(9);
  });

  it('consumes one round for each eligible shot and blocks empty firing', () => {
    let weapon = INITIAL_WEAPON_STATE;
    for (let shot = 0; shot < MAGAZINE_CAPACITY; shot += 1) {
      expect(canFireWeapon(weapon, shot, shot + 1)).toBe(true);
      weapon = consumeRound(weapon);
    }
    expect(weapon.ammunition).toBe(0);
    expect(canFireWeapon(weapon, 10, 11)).toBe(false);
    expect(consumeRound(weapon)).toBe(weapon);
  });

  it('starts reload only when eligible and completes with a full magazine', () => {
    expect(startReload(INITIAL_WEAPON_STATE)).toBe(INITIAL_WEAPON_STATE);
    const partiallyLoaded = consumeRound(INITIAL_WEAPON_STATE);
    const reloading = startReload(partiallyLoaded);
    expect(reloading).toEqual({ ammunition: 9, isReloading: true });
    expect(startReload(reloading)).toBe(reloading);
    expect(canFireWeapon(reloading, -Infinity, 1)).toBe(false);
    expect(completeReload(reloading)).toEqual(INITIAL_WEAPON_STATE);
    expect(completeReload(partiallyLoaded)).toBe(partiallyLoaded);
  });

  it('recognizes a non-repeating R key press as reload input', () => {
    expect(isReloadInput('KeyR', false)).toBe(true);
    expect(isReloadInput('KeyR', true)).toBe(false);
    expect(isReloadInput('KeyW', false)).toBe(false);
  });

  it('moves through distinct reload phases and returns to an exact resting pose', () => {
    expect(reloadPoseAt(0)).toMatchObject({
      phase: 'lower',
      positionX: 0,
      positionY: 0,
      rotationX: 0,
      rotationZ: 0,
    });
    expect(reloadPoseAt(RELOAD_PHASE_TIMINGS.lowerEnd).phase).toBe('handle');
    expect(reloadPoseAt(RELOAD_PHASE_TIMINGS.handleEnd).phase).toBe('impact');
    expect(reloadPoseAt(RELOAD_PHASE_TIMINGS.impactEnd).phase).toBe('settle');
    expect(reloadPoseAt(RELOAD_SECONDS)).toEqual({
      phase: 'complete',
      positionX: 0,
      positionY: 0,
      positionZ: 0,
      rotationX: 0,
      rotationZ: 0,
    });
  });
});
