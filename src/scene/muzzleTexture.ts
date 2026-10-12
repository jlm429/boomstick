import { DataTexture, LinearFilter, NoColorSpace, RGBAFormat } from 'three';

const SIZE = 32;
const alpha = new Uint8Array(SIZE * SIZE * 4);
for (let y = 0; y < SIZE; y++)
  for (let x = 0; x < SIZE; x++) {
    const along = Math.sin((Math.PI * y) / (SIZE - 1)) ** 0.65;
    const lobes = 0.6 + 0.4 * Math.sin((Math.PI * 6 * x) / (SIZE - 1)) ** 2;
    const index = (y * SIZE + x) * 4;
    alpha[index] = alpha[index + 1] = alpha[index + 2] = 255 * along * lobes;
    alpha[index + 3] = 255;
  }

// One owned, tiny opacity mask shared by both flash layers.
export function createMuzzleTexture() {
  const texture = new DataTexture(alpha, SIZE, SIZE, RGBAFormat);
  texture.colorSpace = NoColorSpace;
  texture.magFilter = texture.minFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}
