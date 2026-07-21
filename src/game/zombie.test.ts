import { describe, expect, it } from 'vitest';
import {
  ZOMBIE_ATTACK_DISTANCE,
  ZOMBIE_COLLIDER_RADIUS,
  ZOMBIE_CORPSE_SECONDS,
  ZOMBIE_MAX_HEALTH,
  advanceZombieBehavior,
  createZombieBehaviorState,
  createZombieState,
  hitZombie,
  interruptZombieBehavior,
  isZombieCorpseExpired,
  isZombieSteeringBlocked,
  selectZombieSteering,
} from './zombie';

describe('zombie health', () => {
  it('starts alive at the tuneable maximum health', () => {
    expect(createZombieState()).toEqual({ health: ZOMBIE_MAX_HEALTH, dead: false });
  });

  it('takes shotgun damage and enters a permanent death state at zero health', () => {
    let zombie = createZombieState();
    const firstHit = hitZombie(zombie, 8);
    expect(firstHit.reacted).toBe(true);
    expect(firstHit.damage).toBeGreaterThan(0);
    expect(firstHit.state.health).toBeLessThan(ZOMBIE_MAX_HEALTH);

    zombie = firstHit.state;
    while (!zombie.dead) zombie = hitZombie(zombie, 0).state;

    expect(zombie).toEqual({ health: 0, dead: true });
    expect(hitZombie(zombie, 0)).toEqual({ state: zombie, damage: 0, reacted: false });
  });
});

describe('zombie behavior', () => {
  it('uses the reduced true biting distance', () => {
    expect(ZOMBIE_ATTACK_DISTANCE).toBe(1.1);
  });

  it('transitions between chase and attack at the configured distance', () => {
    const chase = advanceZombieBehavior(createZombieBehaviorState(), {
      delta: 0.016,
      directPathClear: true,
      distanceToPlayer: ZOMBIE_ATTACK_DISTANCE + 0.01,
      hitDuration: 2,
    });
    expect(chase.mode).toBe('chase');

    const attack = advanceZombieBehavior(chase, {
      delta: 0.016,
      directPathClear: true,
      distanceToPlayer: ZOMBIE_ATTACK_DISTANCE,
      hitDuration: 2,
    });
    expect(attack.mode).toBe('attack');

    expect(
      advanceZombieBehavior(attack, {
        delta: 0.016,
        directPathClear: true,
        distanceToPlayer: ZOMBIE_ATTACK_DISTANCE + 0.01,
        hitDuration: 2,
      }).mode,
    ).toBe('chase');
  });

  it('keeps chasing when an obstacle blocks a close player', () => {
    expect(
      advanceZombieBehavior(createZombieBehaviorState(), {
        delta: 0.016,
        directPathClear: false,
        distanceToPlayer: ZOMBIE_ATTACK_DISTANCE,
        hitDuration: 2,
      }).mode,
    ).toBe('chase');
  });

  it('recovers from a hit into the behavior appropriate to the current range', () => {
    const attack = { mode: 'attack', elapsed: 0 } as const;
    const hit = interruptZombieBehavior(attack, false);
    expect(hit.mode).toBe('hit');
    expect(
      advanceZombieBehavior(hit, {
        delta: 2,
        directPathClear: true,
        distanceToPlayer: ZOMBIE_ATTACK_DISTANCE,
        hitDuration: 2,
      }).mode,
    ).toBe('attack');
    expect(
      advanceZombieBehavior(hit, {
        delta: 2,
        directPathClear: true,
        distanceToPlayer: ZOMBIE_ATTACK_DISTANCE + 1,
        hitDuration: 2,
      }).mode,
    ).toBe('chase');
    expect(
      advanceZombieBehavior(hit, {
        delta: 2,
        directPathClear: false,
        distanceToPlayer: ZOMBIE_ATTACK_DISTANCE,
        hitDuration: 2,
      }).mode,
    ).toBe('chase');
  });

  it('requires a clear path to attack or recover from a hit into attack', () => {
    const blockedAttack = advanceZombieBehavior(
      { mode: 'attack', elapsed: 0 },
      {
        delta: 0.016,
        distanceToPlayer: ZOMBIE_ATTACK_DISTANCE,
        directPathClear: false,
        hitDuration: 2,
      },
    );
    expect(blockedAttack.mode).toBe('chase');

    expect(
      advanceZombieBehavior(
        { mode: 'hit', elapsed: 1.9 },
        {
          delta: 0.1,
          distanceToPlayer: ZOMBIE_ATTACK_DISTANCE,
          directPathClear: false,
          hitDuration: 2,
        },
      ).mode,
    ).toBe('chase');
  });

  it('keeps the corpse through the death animation and five-second hold', () => {
    const dead = interruptZombieBehavior(createZombieBehaviorState(), true);
    const deathAnimationDuration = 3.3;
    expect(
      isZombieCorpseExpired(
        { ...dead, elapsed: deathAnimationDuration + ZOMBIE_CORPSE_SECONDS - 0.01 },
        deathAnimationDuration,
      ),
    ).toBe(false);
    expect(
      isZombieCorpseExpired(
        { ...dead, elapsed: deathAnimationDuration + ZOMBIE_CORPSE_SECONDS },
        deathAnimationDuration,
      ),
    ).toBe(true);
  });
});

describe('zombie steering', () => {
  const castAgainstWall = (
    origin: { x: number; z: number },
    direction: { x: number; z: number },
    maximumDistance: number,
  ) => {
    const wall = { minimumX: -1, maximumX: 0, minimumZ: -10, maximumZ: 10 };
    if (
      origin.x >= wall.minimumX &&
      origin.x <= wall.maximumX &&
      origin.z >= wall.minimumZ &&
      origin.z <= wall.maximumZ
    ) {
      return 0;
    }

    const distances = [
      direction.x === 0 ? Infinity : (wall.minimumX - origin.x) / direction.x,
      direction.x === 0 ? Infinity : (wall.maximumX - origin.x) / direction.x,
      direction.z === 0 ? Infinity : (wall.minimumZ - origin.z) / direction.z,
      direction.z === 0 ? Infinity : (wall.maximumZ - origin.z) / direction.z,
    ].filter((distance) => {
      if (distance < 0 || distance > maximumDistance) return false;
      const x = origin.x + direction.x * distance;
      const z = origin.z + direction.z * distance;
      return (
        x >= wall.minimumX && x <= wall.maximumX && z >= wall.minimumZ && z <= wall.maximumZ
      );
    });
    return distances.length > 0 ? Math.min(...distances) : null;
  };

  it('keeps direct pursuit on a proven clear path', () => {
    const steering = selectZombieSteering({ x: 0, z: 8 }, 8, null, () => false);

    expect(steering).toEqual({
      direction: { x: 0, z: 1 },
      directPathClear: true,
      side: null,
    });
  });

  it('selects and preserves viable alternate steering while the direct path is blocked', () => {
    const blockedDirections: number[] = [];
    const first = selectZombieSteering({ x: 0, z: 8 }, 8, null, (direction) => {
      blockedDirections.push(direction.x);
      return Math.abs(direction.x) < 0.5;
    });
    const next = selectZombieSteering(
      { x: 0, z: 7 },
      7,
      first.side,
      (direction) => Math.abs(direction.x) < 0.5,
    );

    expect(blockedDirections[0]).toBe(0);
    expect(first.directPathClear).toBe(false);
    expect(first.direction.x).not.toBe(0);
    expect(first.direction.z).toBeGreaterThan(0);
    expect(next.side).toBe(first.side);
    expect(Math.sign(next.direction.x)).toBe(Math.sign(first.direction.x));
  });

  it('stops instead of selecting a direction through surrounding geometry', () => {
    expect(selectZombieSteering({ x: 0, z: 8 }, 8, 1, () => true)).toEqual({
      direction: { x: 0, z: 0 },
      directPathClear: false,
      side: 1,
    });
  });

  it('keeps boundary steering viable when a clearance ray starts inside a wall', () => {
    const position = { x: ZOMBIE_COLLIDER_RADIUS, z: 0 };
    const steering = selectZombieSteering(
      { x: -8, z: 0 },
      8,
      null,
      (direction, maximumDistance) =>
        isZombieSteeringBlocked(position, direction, maximumDistance, castAgainstWall),
    );

    expect(steering.directPathClear).toBe(false);
    expect(Math.abs(steering.direction.x)).toBeLessThan(0.000001);
    expect(Math.abs(steering.direction.z)).toBe(1);
  });
});
