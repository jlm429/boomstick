import type { Vector3Tuple } from './arena';

export type TargetDefinition = Readonly<{
  id: string;
  position: Vector3Tuple;
  halfExtents: Vector3Tuple;
}>;

export const ARENA_TARGETS: readonly TargetDefinition[] = [
  { id: 'target-near', position: [0, 2, 3], halfExtents: [0.7, 1, 0.24] },
  { id: 'target-left', position: [-4.5, 2, -4], halfExtents: [0.7, 1, 0.24] },
  { id: 'target-right', position: [6, 2, -8], halfExtents: [0.7, 1, 0.24] },
  { id: 'target-far', position: [0, 2, -18], halfExtents: [0.7, 1, 0.24] },
];
