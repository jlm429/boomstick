import { describe, expect, it } from 'vitest';
import { LinearMipmapLinearFilter, NoColorSpace, RepeatWrapping, SRGBColorSpace } from 'three';
import { createSurfaceTextures } from './surfaceTextures';

describe('generated surface texture channels', () => {
  it('caches immutable CPU tiles and owns separate GPU textures with filtered color/data spaces', () => {
    const first = createSurfaceTextures('concrete', 12, true);
    const second = createSurfaceTextures('concrete', 2, true);
    expect(first.data).not.toBe(second.data);
    expect(first.data.image.data).toBe(second.data.image.data);
    expect(first.data.colorSpace).toBe(NoColorSpace);
    expect(first.color!.colorSpace).toBe(SRGBColorSpace);
    expect(first.data.wrapS).toBe(RepeatWrapping);
    expect(first.data.minFilter).toBe(LinearMipmapLinearFilter);
    expect(first.data.generateMipmaps).toBe(true);
    expect(first.data.repeat.toArray()).toEqual([12, 12]);
    expect(second.data.repeat.toArray()).toEqual([2, 2]);
    const seam = 0;
    const interior = (64 * 128 + 64) * 4;
    const data = first.data.image.data!;
    expect(data[seam]).toBeLessThan(data[interior]);
    expect(data[seam + 1]).toBeGreaterThan(210);
    expect(first.color!.image.data![seam]).toBeLessThan(first.color!.image.data![interior]);
    first.data.dispose();
    first.color!.dispose();
    second.data.dispose();
    second.color!.dispose();
  });
});
