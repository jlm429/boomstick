import { extend, type ThreeElements } from '@react-three/fiber';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const BevelGeometry = extend(RoundedBoxGeometry);

type Props = Omit<ThreeElements['mesh'], 'args'> & {
  args: [number, number, number];
  radius: number;
};

export function BeveledBox({ args, radius, children, ...props }: Props) {
  return (
    <mesh {...props}>
      <BevelGeometry args={[...args, 1, radius]} />
      {children}
    </mesh>
  );
}
