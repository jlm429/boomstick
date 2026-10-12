import { act } from 'react';
import { createRoot } from '@react-three/fiber';
import { describe, expect, it, vi } from 'vitest';
import {
  PerspectiveCamera,
  Points,
  Raycaster,
  Scene,
  Vector3,
  type WebGLRenderer,
  type BufferGeometry,
  type ShaderMaterial,
} from 'three';
import { ImpactParticles } from './ImpactParticles';
import { ImpactParticlePool } from './particlePool';

// Exercise actual R3F ownership, upload buffers, frame callbacks and cleanup.
describe('pooled particle presentation', () => {
  it('reuses one non-shootable Points object, freezes on pause and clears/disposes on death and unmount', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const canvas = document.createElement('canvas');
    const scene = new Scene();
    const root = createRoot(canvas);
    const pool = new ImpactParticlePool(42);
    const renderer = {
      render: vi.fn(),
      compile: vi.fn(),
      setSize: vi.fn(),
      setPixelRatio: vi.fn(),
      getPixelRatio: () => 1,
      domElement: canvas,
      xr: { addEventListener: vi.fn(), removeEventListener: vi.fn() },
    } as unknown as WebGLRenderer;
    await root.configure({
      gl: renderer,
      scene,
      camera: new PerspectiveCamera(),
      frameloop: 'never',
      size: { width: 640, height: 480, top: 0, left: 0 },
    });
    let store: ReturnType<typeof root.render>;
    await act(async () => {
      store = root.render(<ImpactParticles pool={pool} active clear={false} />);
    });
    const frame = (delta: number) => {
      const state = store.getState();
      for (const { ref } of state.internal.subscribers) ref.current(state, delta);
    };
    try {
      const points = scene.children[0] as Points<BufferGeometry, ShaderMaterial>;
      expect(points.isPoints).toBe(true);
      expect(renderer.compile).toHaveBeenCalledWith(points, store!.getState().camera, scene);
      const geometry = points.geometry;
      const material = points.material;
      const disposeGeometry = vi.spyOn(geometry, 'dispose');
      const disposeMaterial = vi.spyOn(material, 'dispose');
      pool.emit('blood', { x: 0, y: 0, z: -2 }, { x: 0, y: 0, z: 1 }, () => 0.5);
      frame(0.016);
      expect(points.visible).toBe(true);
      expect(geometry.attributes.position.array).toBe(pool.positions);
      expect(geometry.attributes.shape.array).toBe(pool.shapes);
      expect(
        new Raycaster(new Vector3(), new Vector3(0, 0, -1)).intersectObject(points),
      ).toHaveLength(0);
      await act(async () => {
        root.render(<ImpactParticles pool={pool} active={false} clear={false} />);
      });
      const opacity = [...pool.opacity];
      frame(2);
      expect([...pool.opacity]).toEqual(opacity);
      expect(scene.children[0]).toBe(points);
      await act(async () => {
        root.render(<ImpactParticles pool={pool} active={false} clear />);
      });
      expect(pool.activeCount).toBe(0);
      expect(points.visible).toBe(false);
      await act(async () => {
        root.render(<ImpactParticles pool={pool} active clear={false} />);
      });
      pool.emit('light', { x: 0, y: 0, z: -2 }, { x: 0, y: 0, z: 1 }, () => 0.5);
      frame(0.016);
      expect(scene.children[0]).toBe(points);
      expect(points.geometry).toBe(geometry);
      expect(points.material).toBe(material);
      expect(geometry.attributes.shape.array).toBe(pool.shapes);
      expect(pool.shapes[2]).toBe(0);
      await act(async () => root.unmount());
      expect(pool.activeCount).toBe(0);
      expect(disposeGeometry).toHaveBeenCalledOnce();
      expect(disposeMaterial).toHaveBeenCalledOnce();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
