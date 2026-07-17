import { ARENA_HALF_EXTENT, PLAYER_SPAWN } from './constants';

export type Vector3Tuple = readonly [number, number, number];

export type ArenaBlock = Readonly<{
  id: string;
  position: Vector3Tuple;
  halfExtents: Vector3Tuple;
  color: string;
  emissive?: string;
}>;

export const ARENA_RENDER_CONFIG = {
  background: '#130e0e',
  fog: true,
  postprocessing: false,
  landmark: [0, 3, -10] as const,
} as const;

export const ARENA_BLOCKS: readonly ArenaBlock[] = [
  {
    id: 'floor',
    position: [0, -0.5, 0],
    halfExtents: [ARENA_HALF_EXTENT, 0.5, ARENA_HALF_EXTENT],
    color: '#2a211d',
  },
  {
    id: 'north-wall',
    position: [0, 4, -ARENA_HALF_EXTENT],
    halfExtents: [ARENA_HALF_EXTENT, 4, 0.5],
    color: '#352823',
  },
  {
    id: 'south-wall',
    position: [0, 4, ARENA_HALF_EXTENT],
    halfExtents: [ARENA_HALF_EXTENT, 4, 0.5],
    color: '#352823',
  },
  {
    id: 'west-wall',
    position: [-ARENA_HALF_EXTENT, 4, 0],
    halfExtents: [0.5, 4, ARENA_HALF_EXTENT],
    color: '#352823',
  },
  {
    id: 'east-wall',
    position: [ARENA_HALF_EXTENT, 4, 0],
    halfExtents: [0.5, 4, ARENA_HALF_EXTENT],
    color: '#352823',
  },
  {
    id: 'landmark-left',
    position: [-2.8, 3, -10],
    halfExtents: [0.45, 3, 0.8],
    color: '#a44a23',
    emissive: '#421208',
  },
  {
    id: 'landmark-right',
    position: [2.8, 3, -10],
    halfExtents: [0.45, 3, 0.8],
    color: '#a44a23',
    emissive: '#421208',
  },
  {
    id: 'landmark-top',
    position: [0, 5.65, -10],
    halfExtents: [3.25, 0.35, 0.8],
    color: '#a44a23',
    emissive: '#421208',
  },
  {
    id: 'west-pillar',
    position: [-9, 2, -3],
    halfExtents: [1.2, 2, 1.2],
    color: '#4b3328',
  },
  {
    id: 'east-pillar',
    position: [9, 2, -3],
    halfExtents: [1.2, 2, 1.2],
    color: '#4b3328',
  },
  {
    id: 'west-cover',
    position: [-8, 1.1, 5],
    halfExtents: [3.2, 1.1, 1.4],
    color: '#46332c',
  },
  {
    id: 'east-cover',
    position: [9, 1.25, 8],
    halfExtents: [2.5, 1.25, 1.7],
    color: '#46332c',
  },
  {
    id: 'north-cover',
    position: [-12, 1.25, -14],
    halfExtents: [2.4, 1.25, 1.6],
    color: '#4b3328',
  },
];

export const isFiniteVector3 = (value: Vector3Tuple) => value.every(Number.isFinite);

export function isArenaSpawnValid(spawn: Vector3Tuple = PLAYER_SPAWN) {
  const [x, y, z] = spawn;
  return (
    isFiniteVector3(spawn) &&
    y > 0 &&
    Math.abs(x) < ARENA_HALF_EXTENT - 1 &&
    Math.abs(z) < ARENA_HALF_EXTENT - 1 &&
    ARENA_BLOCKS.every(
      ({ id, position, halfExtents }) =>
        id === 'floor' ||
        Math.abs(y - position[1]) > halfExtents[1] + 1 ||
        Math.abs(x - position[0]) > halfExtents[0] + 0.6 ||
        Math.abs(z - position[2]) > halfExtents[2] + 0.6,
    )
  );
}

export const shouldResetPlayerPosition = (x: number, y: number, z: number) =>
  !Number.isFinite(x) ||
  !Number.isFinite(y) ||
  !Number.isFinite(z) ||
  y < -8 ||
  Math.abs(x) > ARENA_HALF_EXTENT + 8 ||
  Math.abs(z) > ARENA_HALF_EXTENT + 8;
