export type MovementInput = Readonly<{
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
}>;

export function movementVector(input: MovementInput): readonly [number, number] {
  const x = Number(input.right) - Number(input.left);
  const z = Number(input.backward) - Number(input.forward);
  const length = Math.hypot(x, z);
  return length > 1 ? [x / length, z / length] : [x, z];
}
