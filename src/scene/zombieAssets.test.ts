import {
  AnimationClip,
  Bone,
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  Raycaster,
  Skeleton,
  SkinnedMesh,
  Uint16BufferAttribute,
  Vector3,
  VectorKeyframeTrack,
} from 'three';
import { describe, expect, it, vi } from 'vitest';
import {
  beginZombieRaycastShot,
  createZombieModelInstance,
  disposeZombieModelInstance,
  installCachedShotRaycast,
  prepareZombieAnimationClips,
} from './zombieAssets';

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

function createAnimationAsset(trackName: string, values: readonly number[]) {
  const asset = new Group();
  asset.animations = [
    new AnimationClip('mixamo.com', 1, [new VectorKeyframeTrack(trackName, [0, 1], values)]),
  ];
  return asset;
}

function createSkinnedTriangle() {
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    'position',
    new Float32BufferAttribute([-1, -1, -3, 1, -1, -3, 0, 1, -3], 3),
  );
  geometry.setAttribute(
    'skinIndex',
    new Uint16BufferAttribute([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 4),
  );
  geometry.setAttribute(
    'skinWeight',
    new Float32BufferAttribute([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], 4),
  );
  const mesh = new SkinnedMesh(geometry, new MeshBasicMaterial({ side: DoubleSide }));
  const bone = new Bone();
  mesh.add(bone);
  mesh.bind(new Skeleton([bone]));
  mesh.updateMatrixWorld(true);
  return mesh;
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

  it('prepares and reuses one immutable animation clip set for every model instance', () => {
    const model = new Group();
    const hips = new Group();
    hips.name = 'mixamorigHips';
    model.add(hips);
    const idle = createAnimationAsset('mixamorig5Hips.position', [0, 0, 0, 1, 0, 2]);
    const run = createAnimationAsset('mixamorig5Hips.position', [2, 0, 4, 8, 0, 10]);
    const assets = { idle, run, attack: run, hit: idle, dying: idle };

    const first = prepareZombieAnimationClips(model, assets);
    const second = prepareZombieAnimationClips(model, assets);
    const preparedRunTrack = first.find(({ name }) => name === 'run')!.tracks[0];

    expect(second).toBe(first);
    expect(preparedRunTrack.name).toBe('mixamorigHips.position');
    expect([...preparedRunTrack.values]).toEqual([2, 0, 4, 2, 0, 4]);
    expect(run.animations[0].tracks[0].name).toBe('mixamorig5Hips.position');
    expect([...run.animations[0].tracks[0].values]).toEqual([2, 0, 4, 8, 0, 10]);
  });

  it('skins vertices once per shot while preserving exact ray intersections for every pellet', () => {
    const mesh = createSkinnedTriangle();
    const originalGetVertexPosition = mesh.getVertexPosition.bind(mesh);
    const getVertexPosition = vi.fn((index: number, target: Vector3) =>
      originalGetVertexPosition(index, target),
    );
    mesh.getVertexPosition = getVertexPosition;
    mesh.computeBoundingSphere();
    getVertexPosition.mockClear();
    installCachedShotRaycast(mesh);
    const raycaster = new Raycaster(new Vector3(0, 0, 0), new Vector3(0, 0, -1));

    beginZombieRaycastShot(raycaster);
    expect(raycaster.intersectObject(mesh)).toHaveLength(1);
    expect(raycaster.intersectObject(mesh)).toHaveLength(1);
    expect(getVertexPosition).toHaveBeenCalledTimes(3);

    beginZombieRaycastShot(raycaster);
    expect(raycaster.intersectObject(mesh)).toHaveLength(1);
    expect(getVertexPosition).toHaveBeenCalledTimes(6);
  });

  it('disposes instance-owned bone textures without touching shared geometry or materials', () => {
    const model = new Group();
    const first = createSkinnedTriangle();
    const second = createSkinnedTriangle();
    second.skeleton = first.skeleton;
    const sharedGeometry = first.geometry;
    const disposeFirstMaterial = vi.spyOn(first.material as MeshBasicMaterial, 'dispose');
    const disposeSecondMaterial = vi.spyOn(second.material as MeshBasicMaterial, 'dispose');
    const disposeSkeleton = vi.spyOn(first.skeleton, 'dispose');
    const disposeGeometry = vi.spyOn(sharedGeometry, 'dispose');
    model.add(first, second);

    disposeZombieModelInstance(model);

    expect(disposeFirstMaterial).not.toHaveBeenCalled();
    expect(disposeSecondMaterial).not.toHaveBeenCalled();
    expect(disposeSkeleton).toHaveBeenCalledOnce();
    expect(disposeGeometry).not.toHaveBeenCalled();
  });
});
