import { BoxGeometry, Color, Float32BufferAttribute, type BufferGeometry } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Vector3Tuple } from '../game/arena';

export function industrialBlockGeometry(size: Vector3Tuple, landmark = false) {
  const [w, h, d] = size;
  const parts: BufferGeometry[] = [];
  const add = (geometry: BufferGeometry, color: string, position: Vector3Tuple = [0, 0, 0]) => {
    const part = geometry.index ? geometry.toNonIndexed() : geometry;
    if (part !== geometry) geometry.dispose();
    part.translate(...position);
    const shade = new Color(color);
    const colors = new Float32Array(part.getAttribute('position').count * 3);
    for (let i = 0; i < colors.length; i += 3) shade.toArray(colors, i);
    part.setAttribute('color', new Float32BufferAttribute(colors, 3));
    parts.push(part);
  };
  const box = (dimensions: Vector3Tuple, position: Vector3Tuple, color: string) =>
    add(new BoxGeometry(...dimensions), color, position);
  // One merged draw per obstacle. Caps and panel relief remain within the original envelope.
  add(
    new RoundedBoxGeometry(w - 0.12, h - 0.12, d - 0.12, 1, 0.1),
    landmark ? '#985337' : '#75746a',
  );
  for (const y of [-h / 2 + 0.09, h / 2 - 0.09]) {
    add(new RoundedBoxGeometry(w, 0.18, d, 1, 0.065), '#343c3d', [0, y, 0]);
  }
  for (const z of [-d / 2 + 0.03, d / 2 - 0.03]) {
    add(
      new RoundedBoxGeometry(w - 0.2, h - 0.48, 0.05, 1, 0.02),
      landmark ? '#bc693e' : '#5b655f',
      [0, 0, z],
    );
    for (let i = 0; i < 3; i++) {
      box([Math.min(0.6, w * 0.3), 0.022, 0.058], [0, h / 2 - 0.27 - i * 0.07, z], '#303938');
    }
    box([w - 0.28, 0.08, 0.06], [0, -h / 2 + 0.36, z], '#c49951');
    const count = Math.max(1, Math.floor(w / 1.5));
    for (let i = 1; i < count; i++) {
      box([0.035, h - 0.52, 0.054], [-w / 2 + (w * i) / count, 0, z], '#303938');
    }
    for (const x of [-w / 2 + 0.18, w / 2 - 0.18]) {
      box([0.07, h - 0.5, 0.054], [x, 0, z], '#a1a295');
    }
  }
  for (const x of [-w / 2 + 0.03, w / 2 - 0.03]) {
    box([0.05, h - 0.48, d - 0.2], [x, 0, 0], '#5b655f');
    box([0.06, 0.08, d - 0.28], [x, -h / 2 + 0.36, 0], '#c49951');
  }
  const merged = mergeGeometries(parts)!;
  for (const part of parts) part.dispose();
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}
