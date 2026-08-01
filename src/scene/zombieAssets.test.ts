import { BufferGeometry, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { createZombieModelInstance } from './zombieAssets';

function createFragmentedModel() {
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    'position',
    new Float32BufferAttribute(
      [
        0, 0, 0, 1, 0, 0, 0, 1, 0, 2, 0, 0, 3, 0, 0, 2, 1, 0, 4, 0, 0, 5, 0, 0, 4, 1, 0, 6, 0,
        0, 7, 0, 0, 6, 1, 0,
      ],
      3,
    ),
  );
  geometry.addGroup(0, 3, 0);
  geometry.addGroup(3, 3, 1);
  geometry.addGroup(6, 3, 0);
  geometry.addGroup(9, 3, 1);
  const source = new Group();
  source.add(new Mesh(geometry, [new MeshBasicMaterial(), new MeshBasicMaterial()]));
  return source;
}

describe('zombie model asset preparation', () => {
  it('consolidates fragmented material groups once without mutating the loader source', () => {
    const source = createFragmentedModel();
    const sourceMesh = source.children[0] as Mesh;

    const first = createZombieModelInstance(source);
    const second = createZombieModelInstance(source);
    const firstMesh = first.children[0] as Mesh;
    const secondMesh = second.children[0] as Mesh;

    expect(sourceMesh.geometry.groups).toHaveLength(4);
    expect(sourceMesh.geometry.getIndex()).toBeNull();
    expect(first).not.toBe(second);
    expect(firstMesh.geometry).toBe(secondMesh.geometry);
    expect(firstMesh.geometry).not.toBe(sourceMesh.geometry);
    expect(
      firstMesh.geometry.groups.map(({ count, materialIndex }) => [count, materialIndex]),
    ).toEqual([
      [6, 0],
      [6, 1],
    ]);
    expect(firstMesh.geometry.getIndex()?.count).toBe(12);
  });
});
