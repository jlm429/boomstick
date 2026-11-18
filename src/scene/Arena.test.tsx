import { createRoot, extend } from '@react-three/fiber';
import { act } from 'react';
import * as THREE from 'three';
import { expect, it, vi } from 'vitest';
import { ARENA_LIGHT_FIXTURES } from '../game/arena';
import { BreakableLights } from './Arena';

vi.mock('three', async () => {
  const { createRequire } = await vi.importActual<typeof import('node:module')>('node:module');
  return createRequire(import.meta.url)('three') as typeof THREE;
});

extend({
  Group: THREE.Group,
  Mesh: THREE.Mesh,
  PointLight: THREE.PointLight,
  BoxGeometry: THREE.BoxGeometry,
  CylinderGeometry: THREE.CylinderGeometry,
  SphereGeometry: THREE.SphereGeometry,
  MeshStandardMaterial: THREE.MeshStandardMaterial,
  MeshBasicMaterial: THREE.MeshBasicMaterial,
});

it('keeps the same contributing point lights mounted through break and reset', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const canvas = document.createElement('canvas');
  const scene = new THREE.Scene();
  const root = createRoot(canvas);
  const renderer = {
    render: vi.fn(),
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

  const onLightHit = () => 'light' as const;
  const renderLights = (brokenLightIds: ReadonlySet<string>) =>
    act(async () => {
      root.render(<BreakableLights brokenLightIds={brokenLightIds} onLightHit={onLightHit} />);
    });
  const visiblePointLights = () => {
    const lights: THREE.PointLight[] = [];
    scene.traverseVisible((object) => {
      if (object instanceof THREE.PointLight) lights.push(object);
    });
    return lights;
  };

  try {
    await renderLights(new Set());
    const intact = visiblePointLights();
    const intensities = intact.map(({ intensity }) => intensity);
    expect(intact).toHaveLength(
      ARENA_LIGHT_FIXTURES.filter(({ contributesLight }) => contributesLight).length,
    );
    expect(intensities.every((intensity) => intensity > 0)).toBe(true);

    await renderLights(new Set(ARENA_LIGHT_FIXTURES.map(({ id }) => id)));
    const broken = visiblePointLights();
    expect(broken.map(({ id }) => id)).toEqual(intact.map(({ id }) => id));
    expect(broken.map(({ intensity }) => intensity)).toEqual(intact.map(() => 0));

    await renderLights(new Set());
    const reset = visiblePointLights();
    expect(reset.map(({ id }) => id)).toEqual(intact.map(({ id }) => id));
    expect(reset.map(({ intensity }) => intensity)).toEqual(intensities);
  } finally {
    await act(async () => root.unmount());
    vi.unstubAllGlobals();
  }
});
