import {
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  NoColorSpace,
  RepeatWrapping,
  RGBAFormat,
  SRGBColorSpace,
} from 'three';

export type SurfaceVariant = 'concrete' | 'metal' | 'wood';
const SIZE = 128;
const tiles = new Map<SurfaceVariant, { data: Uint8Array; color: Uint8Array }>();

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
      const height = seam
        ? 30
        : scratch
          ? 70
          : 128 + noise + (variant === 'wood' ? grain * 22 : broad * 10);
      const roughness = variant === 'metal' ? 220 + broad * 18 : 240 + broad * 9;
      const tint = seam ? 184 : 245 + broad * 6 + noise * 0.35;
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
export function createSurfaceTextures(variant: SurfaceVariant, repeat: number, tint: boolean) {
  const tile = surfaceTile(variant);
  const texture = (
    bytes: Uint8Array,
    colorSpace: typeof NoColorSpace | typeof SRGBColorSpace,
  ) => {
    const result = new DataTexture(bytes, SIZE, SIZE, RGBAFormat);
    result.colorSpace = colorSpace;
    result.wrapS = result.wrapT = RepeatWrapping;
    result.repeat.set(repeat, repeat);
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
