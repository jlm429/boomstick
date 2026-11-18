import { useEffect, useMemo } from 'react';
import { BackSide, Color, Float32BufferAttribute, SphereGeometry, Vector3 } from 'three';
import { ARENA_RENDER_CONFIG } from '../game/arena';

const SKY_TOP = new Color('#647e8c');
const SKY_HAZE = new Color(ARENA_RENDER_CONFIG.background);
const SOFT_CLOUD = new Color('#e1ddd0');
const skyPosition = new Vector3();
const skyColor = new Color();

function skyGeometry() {
  const geometry = new SphereGeometry(82, 72, 36);
  const position = geometry.getAttribute('position');
  const colors = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i++) {
    skyPosition.fromBufferAttribute(position, i).normalize();
    const { x, y, z } = skyPosition;
    const elevation = Math.max(0, Math.min(1, (y + 0.015) * 2.3));
    const bank =
      Math.sin(x * 8 + y * 23 + z * 4) * 0.35 +
      Math.sin(x * 13 - y * 37 + z * 8) * 0.19 +
      Math.cos(x * 19 + z * 11 + y * 45) * 0.1;
    const cloud = Math.max(0, bank - 0.15) * Math.sin(elevation * Math.PI);
    skyColor.copy(SKY_HAZE).lerp(SKY_TOP, elevation).lerp(SOFT_CLOUD, cloud);
    skyColor.toArray(colors, i * 3);
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  return geometry;
}

export function ArenaSky() {
  const geometry = useMemo(() => skyGeometry(), []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} raycast={() => null}>
      <meshBasicMaterial side={BackSide} vertexColors fog={false} toneMapped={false} />
    </mesh>
  );
}
