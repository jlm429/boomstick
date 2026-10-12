import { Material, Mesh, MeshPhongMaterial, NoColorSpace, Texture, type Group } from 'three';

// Derived specular data is application-cached alongside the loader source.
// Entity cleanup owns material clones, never these maps or loader textures.
const specularMaps = new WeakMap<Texture, Texture>();
const ownedMaterials = new WeakMap<Group, Set<Material>>();

export function prepareZombieMaterials(model: Group) {
  const materials = new Map<Material, Material>();
  model.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    const prepare = (source: Material) => {
      const cached = materials.get(source);
      if (cached) return cached;
      const material = source.clone();
      if (material instanceof MeshPhongMaterial) {
        const skin = material.name.includes('_body_');
        material.emissiveIntensity = 0;
        material.color.set(skin ? '#e6ebd8' : '#bfc9c6');
        material.shininess = skin ? 16 : 7;
        material.specular.set(skin ? '#393b32' : '#1d2220');
        material.normalScale.multiplyScalar(skin ? 0.8 : 0.65);
        if (material.specularMap) {
          let map = specularMaps.get(material.specularMap);
          if (!map) {
            map = material.specularMap.clone();
            map.colorSpace = NoColorSpace;
            map.needsUpdate = true;
            specularMaps.set(material.specularMap, map);
          }
          material.specularMap = map;
        }
      }
      materials.set(source, material);
      return material;
    };
    child.material = Array.isArray(child.material)
      ? child.material.map(prepare)
      : prepare(child.material);
  });
  ownedMaterials.set(model, new Set(materials.values()));
}

export function zombieHitFeedback(model: Group, strength: number) {
  for (const material of ownedMaterials.get(model) ?? []) {
    if (!(material instanceof MeshPhongMaterial)) continue;
    material.emissive.setRGB(0.18, 0.035, 0.012);
    material.emissiveIntensity = Math.max(0, strength) * 0.65;
  }
}

export function disposeZombieMaterials(model: Group) {
  for (const material of ownedMaterials.get(model) ?? []) material.dispose();
  ownedMaterials.delete(model);
}
