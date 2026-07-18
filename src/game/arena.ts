import { ARENA_HALF_EXTENT, PLAYER_SPAWN } from './constants';

export type Vector3Tuple = readonly [number, number, number];

export type ArenaBlock = Readonly<{
  id: string;
  position: Vector3Tuple;
  halfExtents: Vector3Tuple;
  color: string;
  emissive?: string;
}>;

export type ArenaLightFixture = Readonly<{
  id: string;
  position: Vector3Tuple;
  rotationY?: number;
  kind: 'wall' | 'pillar' | 'cover' | 'landmark';
  contributesLight: boolean;
}>;

export const ARENA_RENDER_CONFIG = {
  ambientLight: { color: '#a56d53', intensity: 2.8 },
  background: '#130e0e',
  fog: true,
  postprocessing: false,
  toneMappingExposure: 1.22,
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

const WALL_MOUNT_HEIGHT = 3.1;
const WALL_SURFACE_OFFSET = 0.08;
const WALL_REPEAT_OFFSETS = [-8, 8] as const;
const INNER_WALL_FACE = ARENA_HALF_EXTENT - 0.5 - WALL_SURFACE_OFFSET;

const wallFixtures = (
  wall: 'north' | 'south' | 'west' | 'east',
): readonly ArenaLightFixture[] =>
  WALL_REPEAT_OFFSETS.map((offset) => {
    if (wall === 'north') {
      return {
        id: `north-wall-light-${offset}`,
        position: [offset, WALL_MOUNT_HEIGHT, -INNER_WALL_FACE],
        kind: 'wall',
        contributesLight: offset === WALL_REPEAT_OFFSETS[0],
      };
    }
    if (wall === 'south') {
      return {
        id: `south-wall-light-${offset}`,
        position: [-offset, WALL_MOUNT_HEIGHT, INNER_WALL_FACE],
        rotationY: Math.PI,
        kind: 'wall',
        contributesLight: offset === WALL_REPEAT_OFFSETS[0],
      };
    }
    if (wall === 'west') {
      return {
        id: `west-wall-light-${offset}`,
        position: [-INNER_WALL_FACE, WALL_MOUNT_HEIGHT, -offset],
        rotationY: Math.PI / 2,
        kind: 'wall',
        contributesLight: offset === WALL_REPEAT_OFFSETS[0],
      };
    }
    return {
      id: `east-wall-light-${offset}`,
      position: [INNER_WALL_FACE, WALL_MOUNT_HEIGHT, offset],
      rotationY: -Math.PI / 2,
      kind: 'wall',
      contributesLight: offset === WALL_REPEAT_OFFSETS[0],
    };
  });

const topMountedFixtures = (kind: 'pillar' | 'cover'): readonly ArenaLightFixture[] =>
  ARENA_BLOCKS.filter(({ id }) => id.includes(kind)).map(
    ({ id, position, halfExtents }, index) => ({
      id: `${id}-light`,
      position: [position[0], position[1] + halfExtents[1], position[2]],
      kind,
      contributesLight: kind === 'pillar' && index === 0,
    }),
  );

export const ARENA_LIGHT_FIXTURES: readonly ArenaLightFixture[] = [
  ...wallFixtures('north'),
  ...wallFixtures('south'),
  ...wallFixtures('west'),
  ...wallFixtures('east'),
  ...topMountedFixtures('pillar'),
  ...topMountedFixtures('cover'),
  {
    id: 'landmark-light',
    position: [0, 5.65, -9.12],
    kind: 'landmark',
    contributesLight: true,
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
