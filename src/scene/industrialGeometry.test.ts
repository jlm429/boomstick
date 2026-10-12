import { describe, expect, it } from 'vitest';
import { BoxGeometry, Color, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';
import { ARENA_BLOCKS } from '../game/arena';
import { industrialBlockGeometry } from './industrialGeometry';

describe('industrial arena presentation', () => {
  it('exposes panels, caps and trim ahead of the body on every industrial block face', () => {
    const material = new MeshBasicMaterial();
    for (const block of ARENA_BLOCKS.filter((b) => /cover|pillar|landmark/.test(b.id))) {
      const [w, h, d] = block.halfExtents.map((v) => v * 2);
      const landmark = block.id.includes('landmark');
      const geometry = industrialBlockGeometry([w, h, d], landmark);
      const mesh = new Mesh(geometry, material);
      mesh.updateMatrixWorld();
      const bodyColor = new Color(landmark ? '#985337' : '#75746a');
      const probe = (axis: number, sign: number, point: Vector3, expected: string) => {
        const half = block.halfExtents[axis];
        point.setComponent(axis, sign * (half + 1));
        const direction = new Vector3().setComponent(axis, -sign);
        const hits = new Raycaster(point, direction).intersectObject(mesh);
        const colors = geometry.getAttribute('color');
        const colorAt = (index: number) =>
          new Color().fromBufferAttribute(colors, hits[index].face!.a);
        const matches = (color: Color, expectedColor: Color) =>
          color
            .toArray()
            .every((value, i) => Math.abs(value - expectedColor.toArray()[i]) < 1e-6);
        expect(hits.length, block.id).toBeGreaterThan(0);
        expect(matches(colorAt(0), new Color(expected)), block.id).toBe(true);
        const bodyIndex = hits.findIndex((_, i) => matches(colorAt(i), bodyColor));
        expect(bodyIndex, block.id).toBeGreaterThan(0);
        expect(hits[bodyIndex].distance - hits[0].distance, block.id).toBeGreaterThan(0.004);
        for (let i = 0; i < hits.length; i++) {
          for (let j = i + 1; j < hits.length; j++) {
            if (!matches(colorAt(i), colorAt(j))) {
              expect(Math.abs(hits[i].distance - hits[j].distance), block.id).toBeGreaterThan(
                0.0005,
              );
            }
          }
        }
      };
      for (const sign of [-1, 1]) {
        probe(1, sign, new Vector3(), '#343c3d');
        for (const axis of [0, 2]) {
          probe(axis, sign, new Vector3(0, h / 2 - 0.08, 0), '#343c3d');
          probe(axis, sign, new Vector3(0, -h / 2 + 0.08, 0), '#343c3d');
          probe(
            axis,
            sign,
            new Vector3(w * 0.23, (h - 0.48) * 0.35, 0),
            axis === 2 && landmark ? '#bc693e' : '#5b655f',
          );
          probe(axis, sign, new Vector3(w * 0.23, -h / 2 + 0.36, 0), '#c49951');
        }
        for (let i = 0; i < 3; i++) {
          probe(
            2,
            sign,
            new Vector3(0, h / 2 - 0.27 - i * 0.07, 0),
            h < 0.8 && i === 1 ? '#c49951' : '#303938',
          );
        }
        for (const x of [-w / 2 + 0.18, w / 2 - 0.18]) {
          probe(2, sign, new Vector3(x, 0.085, 0), '#a1a295');
        }
        const count = Math.max(1, Math.floor(w / 1.5));
        for (let i = 1; i < count; i++) {
          probe(2, sign, new Vector3(-w / 2 + (w * i) / count, -0.085, 0), '#303938');
        }
      }
      geometry.dispose();
    }
    material.dispose();
  });

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
