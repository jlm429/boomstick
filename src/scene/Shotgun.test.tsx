import { act } from 'react';
import { createRoot, extend } from '@react-three/fiber';
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { INITIAL_WEAPON_STATE } from '../game/shooting';
import { Shotgun } from './CombatScene';

vi.mock('three', async () => {
  const { createRequire } = await vi.importActual<{
    createRequire: (url: string) => (id: string) => unknown;
  }>('node:module');
  return createRequire(import.meta.url)('three') as typeof THREE;
});

extend({
  Group: THREE.Group,
  Mesh: THREE.Mesh,
  PointLight: THREE.PointLight,
  BoxGeometry: THREE.BoxGeometry,
  CylinderGeometry: THREE.CylinderGeometry,
  RingGeometry: THREE.RingGeometry,
  CircleGeometry: THREE.CircleGeometry,
  ConeGeometry: THREE.ConeGeometry,
  MeshStandardMaterial: THREE.MeshStandardMaterial,
  MeshBasicMaterial: THREE.MeshBasicMaterial,
});

describe('shotgun decorative surfaces', () => {
  it('exposes outward muzzle faces and raised trim on both sides', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const canvas = document.createElement('canvas');
    const scene = new THREE.Scene();
    const root = createRoot(canvas);
    const renderer = {
      render: vi.fn(),
      compile: vi.fn(),
      setSize: vi.fn(),
      setPixelRatio: vi.fn(),
      domElement: canvas,
      xr: { addEventListener: vi.fn(), removeEventListener: vi.fn() },
    } as unknown as THREE.WebGLRenderer;
    await root.configure({
      gl: renderer,
      scene,
      frameloop: 'never',
      size: { width: 640, height: 480, top: 0, left: 0 },
    });
    try {
      await act(async () => {
        root.render(
          <Shotgun
            lifeState="alive"
            shotIdRef={{ current: 0 }}
            weaponStateRef={{ current: { ...INITIAL_WEAPON_STATE } }}
            reloadStartedAtRef={{ current: 0 }}
          />,
        );
      });
      scene.updateMatrixWorld(true);
      const meshes: THREE.Mesh[] = [];
      scene.traverseVisible((object) => {
        if (object instanceof THREE.Mesh) meshes.push(object);
      });
      const probe = (origin: THREE.Vector3, direction: THREE.Vector3, color: string) => {
        const hits = new THREE.Raycaster(
          origin.multiplyScalar(0.68),
          direction,
        ).intersectObjects(meshes, false);
        expect(hits.length).toBeGreaterThan(0);
        const mesh = hits[0].object as THREE.Mesh<
          THREE.BufferGeometry,
          THREE.MeshStandardMaterial
        >;
        expect(mesh.material.color.getHexString()).toBe(new THREE.Color(color).getHexString());
        return hits[0];
      };
      for (const x of [-0.12, 0.12]) {
        for (const offset of [-0.07, 0, 0.07]) {
          const hit = probe(
            new THREE.Vector3(x + offset, 0.13, -3),
            new THREE.Vector3(0, 0, 1),
            offset === 0 ? '#101518' : '#a9ad9e',
          );
          const normal = hit.face!.normal.clone().transformDirection(hit.object.matrixWorld);
          expect(normal.z).toBeLessThan(-0.99);
          if (offset === 0) expect(hit.point.z / 0.68).toBeGreaterThan(-1.98);
          else expect(hit.point.z / 0.68).toBeLessThan(-1.98);
        }
      }
      for (const x of [-0.17, 0.17]) {
        for (const z of [-0.76, -0.92, -1]) {
          const hit = probe(new THREE.Vector3(x, 1, z), new THREE.Vector3(0, -1, 0), '#be9657');
          expect(hit.point.y / 0.68).toBeGreaterThan(0.225);
        }
      }
      for (const z of [-1.22, -1.1, -0.98, -0.86]) {
        const hit = probe(new THREE.Vector3(0.1, 1, z), new THREE.Vector3(0, -1, 0), '#553b2b');
        expect(hit.point.y / 0.68).toBeGreaterThan(0.225);
      }
    } finally {
      await act(async () => root.unmount());
      vi.unstubAllGlobals();
    }
  });

  it('bounds flash lifetime, freezes pause and never retriggers from an unrelated render', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const canvas = document.createElement('canvas');
    const scene = new THREE.Scene();
    const root = createRoot(canvas);
    const renderer = {
      render: vi.fn(),
      compile: vi.fn(),
      setSize: vi.fn(),
      setPixelRatio: vi.fn(),
      domElement: canvas,
      xr: { addEventListener: vi.fn(), removeEventListener: vi.fn() },
    } as unknown as THREE.WebGLRenderer;
    await root.configure({
      gl: renderer,
      scene,
      frameloop: 'never',
      size: { width: 640, height: 480, top: 0, left: 0 },
    });
    const shotIdRef = { current: 0 };
    const weaponStateRef = { current: { ...INITIAL_WEAPON_STATE } };
    const reloadStartedAtRef = { current: 0 };
    let store: ReturnType<typeof root.render>;
    const render = async (active: boolean, lifeState: 'alive' | 'dying' = 'alive') => {
      await act(async () => {
        store = root.render(
          <Shotgun
            active={active}
            lifeState={lifeState}
            shotIdRef={shotIdRef}
            weaponStateRef={weaponStateRef}
            reloadStartedAtRef={reloadStartedAtRef}
          />,
        );
      });
    };
    const frame = (delta: number) => {
      const state = store.getState();
      for (const { ref } of state.internal.subscribers) ref.current(state, delta);
    };
    try {
      await render(true);
      const weapon = scene.children[0] as THREE.Group;
      const flash = weapon.children.find(
        (object) => object instanceof THREE.Group && object.position.z === -2.02,
      )!;
      expect(flash.visible).toBe(false);
      expect(renderer.compile).toHaveBeenCalledWith(flash, store!.getState().camera, scene);
      shotIdRef.current++;
      frame(0.016);
      expect(flash.visible).toBe(true);
      expect(flash.children).toHaveLength(2);
      expect(
        new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, 0, -1)).intersectObject(
          flash,
          true,
        ),
      ).toHaveLength(0);
      await render(false);
      frame(1);
      expect(flash.visible).toBe(true);
      await render(true);
      for (let i = 0; i < 4; i++) frame(0.016);
      expect(flash.visible).toBe(false);
      await render(true);
      frame(0.016);
      expect(flash.visible).toBe(false);
      shotIdRef.current++;
      frame(0.016);
      expect(flash.visible).toBe(true);
      frame(0.5);
      expect(flash.visible).toBe(false);
      shotIdRef.current++;
      frame(0.016);
      await render(false, 'dying');
      frame(0.016);
      expect(flash.visible).toBe(false);
    } finally {
      await act(async () => root.unmount());
      vi.unstubAllGlobals();
    }
  });
});
