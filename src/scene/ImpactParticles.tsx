import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BufferAttribute, BufferGeometry, Points, ShaderMaterial } from 'three';
import type { ImpactParticlePool } from './particlePool';

export function ImpactParticles({
  pool,
  active,
  clear,
}: {
  pool: ImpactParticlePool;
  active: boolean;
  clear: boolean;
}) {
  const { gl, camera, scene } = useThree();
  const [points] = useState(() => {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(pool.positions, 3));
    geometry.setAttribute('color', new BufferAttribute(pool.colors, 3));
    geometry.setAttribute('opacity', new BufferAttribute(pool.opacity, 1));
    geometry.setAttribute('size', new BufferAttribute(pool.sizes, 1));
    geometry.setAttribute('shape', new BufferAttribute(pool.shapes, 3));
    const material = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { pixelHeight: { value: 1 } },
      vertexShader: `
        attribute vec3 color;
        attribute float opacity;
        attribute float size;
        attribute vec3 shape;
        uniform float pixelHeight;
        varying vec3 tint;
        varying float alpha;
        varying vec3 droplet;
        void main() {
          vec4 view = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * view;
          gl_PointSize = clamp(size * pixelHeight * projectionMatrix[1][1] * 0.5 / max(0.1, -view.z), 1.0, 32.0);
          tint = color;
          alpha = opacity;
          droplet = shape;
        }`,
      fragmentShader: `
        varying vec3 tint;
        varying float alpha;
        varying vec3 droplet;
        void main() {
          vec2 coord = gl_PointCoord - 0.5;
          float edge = 0.35;
          if (droplet.z > 0.5) {
            float c = cos(droplet.y), s = sin(droplet.y);
            coord = mat2(c, -s, s, c) * coord;
            coord.x += sin(coord.y * 14.0 + droplet.y) * 0.025;
            coord.x *= (1.0 + max(0.0, coord.y) * 1.4) / droplet.x;
            edge = 0.65;
          }
          float radius = length(coord) * 2.0;
          if (radius >= 1.0 || alpha <= 0.0) discard;
          vec3 pigment = tint * (droplet.z > 0.5 ? 1.0 - radius * radius * 0.35 : 1.0);
          gl_FragColor = vec4(pigment, alpha * (1.0 - smoothstep(edge, 1.0, radius)));
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    const object = new Points(geometry, material);
    object.frustumCulled = false;
    object.raycast = () => {};
    object.visible = false;
    return object;
  });

  // Prepare this small owned shader before the first accepted shot, while hidden.
  useEffect(() => {
    gl.compile(points, camera, scene);
  }, [gl, camera, scene, points]);
  const pointsRef = useRef<Points<BufferGeometry, ShaderMaterial>>(null);
  useLayoutEffect(() => {
    if (!clear) return;
    pool.clear();
    if (pointsRef.current) pointsRef.current.visible = false;
  }, [clear, pool]);
  useEffect(
    () => () => {
      pool.clear();
      points.geometry.dispose();
      points.material.dispose();
    },
    [points, pool],
  );
  useFrame(({ gl, size }, delta) => {
    const object = pointsRef.current;
    if (!object) return;
    pool.advance(delta, active);
    object.visible = pool.activeCount > 0;
    if (!object.visible || !active) return;
    object.material.uniforms.pixelHeight.value = size.height * gl.getPixelRatio();
    object.geometry.attributes.position.needsUpdate = true;
    object.geometry.attributes.color.needsUpdate = true;
    object.geometry.attributes.opacity.needsUpdate = true;
    object.geometry.attributes.size.needsUpdate = true;
    object.geometry.attributes.shape.needsUpdate = true;
  });
  return <primitive ref={pointsRef} object={points} dispose={null} />;
}
