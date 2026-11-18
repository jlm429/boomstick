import {
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  NoColorSpace,
  RepeatWrapping,
  RGBAFormat,
  SRGBColorSpace,
} from 'three';

export type SurfaceVariant = 'concrete' | 'gravel' | 'metal' | 'wood';
const SIZE = 128;
const tiles = new Map<SurfaceVariant, { data: Uint8Array; color: Uint8Array }>();

function tileNoise(x: number, y: number, cells: number) {
  const u = (x / SIZE) * cells;
  const v = (y / SIZE) * cells;
  const ix = Math.floor(u);
  const iy = Math.floor(v);
  const random = (a: number, b: number) =>
    ((Math.imul((a % cells) + 191, 1597334677) ^ Math.imul((b % cells) + 31, 3812015801)) >>>
      0) /
    0xffffffff;
  const blend = (a: number, b: number, t: number) => a + (b - a) * t * t * (3 - 2 * t);
  return blend(
    blend(random(ix, iy), random(ix + 1, iy), u - ix),
    blend(random(ix, iy + 1), random(ix + 1, iy + 1), u - ix),
    v - iy,
  );
}

function surfaceTile(variant: SurfaceVariant) {
  const cached = tiles.get(variant);
  if (cached) return cached;
  const data = new Uint8Array(SIZE * SIZE * 4);
  const color = new Uint8Array(data.length);
  let seed = 719;
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const noise = (seed % 17) - 8;
      const broad = Math.sin((x * Math.PI * 4) / SIZE) * Math.cos((y * Math.PI * 2) / SIZE);
      const grain = Math.sin(
        (x * Math.PI * 18) / SIZE + Math.sin((y * Math.PI * 2) / SIZE) * 0.6,
      );
      const seam = variant === 'concrete' && (x < 2 || y < 2);
      const scratch = variant === 'metal' && y % 37 === 3 && x > 21 && x < 83;
      const mottling = tileNoise(x, y, 5) * 0.65 + tileNoise(x, y, 23) * 0.35;
      const height = seam
        ? 30
        : scratch
          ? 70
          : 98 +
            noise * (variant === 'gravel' ? 3 : 1.3) +
            (variant === 'wood' ? grain * 22 : mottling * 57);
      const roughness = variant === 'metal' ? 220 + broad * 18 : 240 + broad * 9;
      const tint = seam
        ? 142
        : 162 + mottling * 76 + noise * (variant === 'gravel' ? 2.8 : 0.9);
      const offset = (y * SIZE + x) * 4;
      data[offset] = height;
      data[offset + 1] = roughness;
      data[offset + 2] = 255;
      data[offset + 3] = 255;
      color[offset] = color[offset + 1] = color[offset + 2] = tint;
      color[offset + 3] = 255;
    }
  const tile = { data, color };
  tiles.set(variant, tile);
  return tile;
}

// CPU tiles are immutable and cached; each mounted finish owns its GPU textures.
export function createSurfaceTextures(
  variant: SurfaceVariant,
  repeat: number | readonly [number, number],
  tint: boolean,
) {
  const tile = surfaceTile(variant);
  const texture = (
    bytes: Uint8Array,
    colorSpace: typeof NoColorSpace | typeof SRGBColorSpace,
  ) => {
    const result = new DataTexture(bytes, SIZE, SIZE, RGBAFormat);
    result.colorSpace = colorSpace;
    result.wrapS = result.wrapT = RepeatWrapping;
    result.repeat.set(...(typeof repeat === 'number' ? ([repeat, repeat] as const) : repeat));
    result.magFilter = LinearFilter;
    result.minFilter = LinearMipmapLinearFilter;
    result.generateMipmaps = true;
    result.needsUpdate = true;
    return result;
  };
  return {
    data: texture(tile.data, NoColorSpace),
    color: tint ? texture(tile.color, SRGBColorSpace) : null,
  };
}
