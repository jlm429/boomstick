import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import {
  BufferAttribute,
  BufferGeometry,
  Mesh,
  ShaderMaterial,
  Vector3,
  type Group,
} from 'three';

// Soft ground contact cues only. The rig, shot mesh and Rapier body are untouched.
export function ZombieFootContact({ model, active }: { model: Group; active: boolean }) {
  const [contact] = useState(() => {
    const feet = ['mixamorigLeftToeBase', 'mixamorigRightToeBase'].map((name) =>
      model.getObjectByName(name),
    );
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(24), 3));
    geometry.setAttribute('strength', new BufferAttribute(new Float32Array(8), 1));
    geometry.setAttribute(
      'uv',
      new BufferAttribute(
        new Float32Array([0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1]),
        2,
      ),
    );
    geometry.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]);
    const material = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      vertexShader: `attribute float strength; varying float alpha; varying vec2 coord;
        void main() { alpha = strength; coord = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `varying float alpha; varying vec2 coord;
        void main() { float r = length(coord - 0.5) * 2.0; if (r >= 1.0) discard;
          gl_FragColor = vec4(0.025, 0.02, 0.015, alpha * pow(1.0 - r, 2.0));
          #include <colorspace_fragment>
        }`,
    });
    const mesh = new Mesh(geometry, material);
    mesh.frustumCulled = false;
    mesh.raycast = () => {};
    return { mesh, feet, position: new Vector3() };
  });
  useEffect(
    () => () => {
      contact.mesh.geometry.dispose();
      contact.mesh.material.dispose();
    },
    [contact],
  );
  const meshRef = useRef<Mesh<BufferGeometry, ShaderMaterial>>(null);
  useFrame(() => {
    if (!active) return;
    const mesh = meshRef.current;
    if (!mesh) return;
    const positions = mesh.geometry.attributes.position;
    const strength = mesh.geometry.attributes.strength;
    for (let foot = 0; foot < 2; foot++) {
      const bone = contact.feet[foot];
      if (!bone) continue;
      bone.getWorldPosition(contact.position);
      const { x, y, z } = contact.position;
      const opacity = 0.42 * Math.max(0, 1 - Math.max(0, y - 0.1) / 0.5);
      for (let vertex = 0; vertex < 4; vertex++) {
        positions.setXYZ(
          foot * 4 + vertex,
          x + (vertex === 1 || vertex === 2 ? 0.23 : -0.23),
          0.018,
          z + (vertex >= 2 ? -0.26 : 0.26),
        );
        strength.setX(foot * 4 + vertex, opacity);
      }
    }
    positions.needsUpdate = true;
    strength.needsUpdate = true;
  });
  return <primitive ref={meshRef} object={contact.mesh} dispose={null} />;
}
