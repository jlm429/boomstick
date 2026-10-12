import { describe, expect, it } from 'vitest';
import { BoxGeometry, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';
import { ARENA_BLOCKS } from '../game/arena';
import { industrialBlockGeometry } from './industrialGeometry';

describe('industrial arena presentation', () => {
  it('keeps all authored surfaces within the existing collider envelopes', () => {
    for (const block of ARENA_BLOCKS.filter((b) => /cover|pillar|landmark/.test(b.id))) {
      const size = block.halfExtents.map((v) => v * 2) as [number, number, number];
      const geometry = industrialBlockGeometry(size, block.id.includes('landmark'));
      const bounds = geometry.boundingBox!;
      for (const [axis, half] of block.halfExtents.entries()) {
        expect(bounds.min.getComponent(axis)).toBeGreaterThanOrEqual(-half - 1e-6);
        expect(bounds.max.getComponent(axis)).toBeLessThanOrEqual(half + 1e-6);
      }
      expect(geometry.groups).toHaveLength(0);
      expect(geometry.getAttribute('color').count).toBe(
        geometry.getAttribute('position').count,
      );
      geometry.dispose();
    }
  });

  it('retains the original box raycast at an edge, even with a non-rendering proxy material', () => {
    const material = new MeshBasicMaterial({ visible: false });
    const geometry = new BoxGeometry(6.4, 2.2, 2.8);
    const proxy = new Mesh(geometry, material);
    proxy.updateMatrixWorld();
    const ray = new Raycaster(new Vector3(3.19, 1.09, 5), new Vector3(0, 0, -1));
    expect(ray.intersectObject(proxy)[0].distance).toBeCloseTo(3.6);
    geometry.dispose();
    material.dispose();
  });
});
