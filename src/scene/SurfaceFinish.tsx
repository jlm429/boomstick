import { LinearFilter, RepeatWrapping, RGBAFormat } from 'three';

// A small deterministic height tile. R3F owns and disposes the texture instances.
const SIZE = 64;
const grain = new Uint8Array(SIZE * SIZE * 4);
let seed = 719;
for (let i = 0; i < grain.length; i += 4) {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  grain[i] = grain[i + 1] = grain[i + 2] = 80 + (seed % 96);
  grain[i + 3] = 255;
}

export function SurfaceFinish({ repeat = 1 }: { repeat?: number }) {
  return (
    <dataTexture
      attach="bumpMap"
      args={[grain, SIZE, SIZE, RGBAFormat]}
      wrapS={RepeatWrapping}
      wrapT={RepeatWrapping}
      repeat={[repeat, repeat]}
      magFilter={LinearFilter}
      minFilter={LinearFilter}
      needsUpdate
    />
  );
}
