import { useEffect, useMemo } from 'react';
import type { DataTexture, MeshStandardMaterial } from 'three';
import { createSurfaceTextures, type SurfaceVariant } from './surfaceTextures';

function attachData(parent: MeshStandardMaterial, texture: DataTexture) {
  const bump = parent.bumpMap;
  const roughness = parent.roughnessMap;
  parent.bumpMap = parent.roughnessMap = texture;
  parent.needsUpdate = true;
  return () => {
    parent.bumpMap = bump;
    parent.roughnessMap = roughness;
    parent.needsUpdate = true;
  };
}

export function SurfaceFinish({
  repeat = 1,
  variant = 'concrete',
  tint = false,
}: {
  repeat?: number;
  variant?: SurfaceVariant;
  tint?: boolean;
}) {
  const textures = useMemo(
    () => createSurfaceTextures(variant, repeat, tint),
    [variant, repeat, tint],
  );
  useEffect(
    () => () => {
      textures.data.dispose();
      textures.color?.dispose();
    },
    [textures],
  );
  return (
    <>
      <primitive object={textures.data} attach={attachData} dispose={null} />
      {textures.color && <primitive object={textures.color} attach="map" dispose={null} />}
    </>
  );
}
