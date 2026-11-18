import type { RapierContext } from '@react-three/rapier';
import { ZOMBIE_COLLIDER_RADIUS, type PlanarDirection } from '../game/zombie';

const IDENTITY_ROTATION = { x: 0, y: 0, z: 0, w: 1 };

export function createZombieObstacleProbe(
  rapier: RapierContext['rapier'],
  world: RapierContext['world'],
) {
  const ray = new rapier.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 });
  // Leave room for Rapier's contact slop when sweeping parallel to a surface.
  const body = new rapier.Ball(ZOMBIE_COLLIDER_RADIUS - 0.02);
  const fixed = rapier.QueryFilterFlags.ONLY_FIXED;

  return {
    setOrigin(x: number, y: number, z: number) {
      ray.origin.x = x;
      ray.origin.y = y;
      ray.origin.z = z;
    },
    isBlocked(direction: PlanarDirection, distance: number) {
      ray.dir.x = direction.x;
      ray.dir.z = direction.z;
      return (
        world.castShape(
          ray.origin,
          IDENTITY_ROTATION,
          ray.dir,
          body,
          0,
          distance,
          false,
          fixed,
        ) !== null
      );
    },
    hasClearBitePath(toPlayer: PlanarDirection, distance: number) {
      ray.dir.x = toPlayer.x / distance;
      ray.dir.z = toPlayer.z / distance;
      return world.castRay(ray, distance, true, fixed) === null;
    },
  };
}
