import { describe, expect, it, vi } from 'vitest';
import {
  BoxGeometry,
  Group,
  Mesh,
  MeshPhongMaterial,
  NoColorSpace,
  SRGBColorSpace,
  Texture,
} from 'three';
import {
  disposeZombieMaterials,
  prepareZombieMaterials,
  zombieHitFeedback,
} from './zombieMaterials';

function fixture() {
  const source = new MeshPhongMaterial({ color: '#e7e7e7', shininess: 20 });
  source.name = 'ZombieGirl_body_Material';
  source.map = new Texture();
  source.map.colorSpace = SRGBColorSpace;
  source.normalMap = new Texture();
  source.specularMap = new Texture();
  source.specularMap.colorSpace = SRGBColorSpace;
  const clothes = source.clone();
  clothes.name = 'ZombieGirl_Material';
  const model = new Group();
  model.add(
    new Mesh(new BoxGeometry(), [source, clothes]),
    new Mesh(new BoxGeometry(), source),
  );
  return { model, source, clothes };
}

describe('zombie material ownership and accepted-hit feedback', () => {
  it('preserves diffuse/normal assets while separating skin and clothing without changing loader materials', () => {
    const { model, source, clothes } = fixture();
    const second = model.clone();
    prepareZombieMaterials(model);
    prepareZombieMaterials(second);
    const [skin, clothing] = (model.children[0] as Mesh).material as MeshPhongMaterial[];
    const secondSkin = ((second.children[0] as Mesh).material as MeshPhongMaterial[])[0];
    expect(skin).not.toBe(source);
    expect(skin).not.toBe(secondSkin);
    expect((model.children[1] as Mesh).material).toBe(skin);
    expect(skin.map).toBe(source.map);
    expect(skin.normalMap).toBe(source.normalMap);
    expect(skin.specularMap).toBe(secondSkin.specularMap);
    expect(skin.specularMap).not.toBe(source.specularMap);
    expect(skin.specularMap!.colorSpace).toBe(NoColorSpace);
    expect(source.specularMap!.colorSpace).toBe(SRGBColorSpace);
    expect(source.color.getHexString()).toBe('e7e7e7');
    expect(source.shininess).toBe(20);
    expect(clothes.shininess).toBe(20);
    expect(skin.shininess).toBeGreaterThan(clothing.shininess);
    expect(skin.color.equals(clothing.color)).toBe(false);
    disposeZombieMaterials(model);
    disposeZombieMaterials(second);
  });

  it('updates only one entity and disposes owned material clones once without disposing shared resources', () => {
    const { model, source } = fixture();
    const second = model.clone();
    prepareZombieMaterials(model);
    prepareZombieMaterials(second);
    const skin = ((model.children[0] as Mesh).material as MeshPhongMaterial[])[0];
    const other = ((second.children[0] as Mesh).material as MeshPhongMaterial[])[0];
    const sourceDispose = vi.spyOn(source, 'dispose');
    const textureDispose = vi.spyOn(skin.specularMap!, 'dispose');
    const geometryDispose = vi.spyOn((model.children[0] as Mesh).geometry, 'dispose');
    const dispose = vi.spyOn(skin, 'dispose');
    zombieHitFeedback(model, 1);
    expect(skin.emissiveIntensity).toBe(0.65);
    expect(other.emissiveIntensity).toBe(0);
    zombieHitFeedback(model, 0);
    expect(skin.emissiveIntensity).toBe(0);
    disposeZombieMaterials(model);
    disposeZombieMaterials(model);
    expect(dispose).toHaveBeenCalledOnce();
    expect(sourceDispose).not.toHaveBeenCalled();
    expect(textureDispose).not.toHaveBeenCalled();
    expect(geometryDispose).not.toHaveBeenCalled();
    disposeZombieMaterials(second);
  });
});
