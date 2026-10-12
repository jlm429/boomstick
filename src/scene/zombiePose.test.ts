import {
  AnimationClip,
  AnimationMixer,
  Bone,
  DoubleSide,
  Float32BufferAttribute,
  BufferGeometry,
  Group,
  MeshBasicMaterial,
  Quaternion,
  QuaternionKeyframeTrack,
  Raycaster,
  Skeleton,
  SkinnedMesh,
  Uint16BufferAttribute,
  Vector3,
} from 'three';
import { describe, expect, it, vi } from 'vitest';
import { WEAK_ZOMBIE_ATTACK, ZombieAttackController } from '../game/zombieAttack';
import {
  applyZombieAnimationTimeScales,
  createInitialZombieWalkPhaseApplier,
  transitionZombieAnimation,
  updateZombieAnimationBlend,
  type ZombieActions,
} from './zombieAnimation';
import { beginZombieRaycastShot, installCachedShotRaycast } from './zombieAssets';
import { ZombiePoseOverlay } from './zombiePose';

function fixture(phase = 0.25) {
  const model = new Group();
  const bones = ['Spine', 'Spine2', 'Head', 'LeftArm', 'RightArm', 'LeftToeBase'].map(
    (name) => {
      const bone = new Bone();
      bone.name = `mixamorig${name}`;
      model.add(bone);
      return bone;
    },
  );
  // A duplicate skin helper must inherit its primary bone, never get a second offset.
  const helper = new Bone();
  helper.name = bones[0].name;
  bones[0].add(helper);
  const mixer = new AnimationMixer(model);
  const actions = Object.fromEntries(
    ['idle', 'run', 'attack', 'hit', 'dying'].map((name) => [
      name,
      mixer.clipAction(
        new AnimationClip(name, 1, [
          new QuaternionKeyframeTrack(
            'mixamorigSpine.quaternion',
            [0, 1],
            [0, 0, 0, 1, 0, 0, 0, 1],
          ),
        ]),
      ),
    ]),
  ) as ZombieActions;
  applyZombieAnimationTimeScales(actions, { speedMultiplier: 1.04, walkPhase: phase });
  const pose = new ZombiePoseOverlay(model, phase);
  const initial = createInitialZombieWalkPhaseApplier(phase);
  const step = (delta: number) => {
    pose.restore();
    updateZombieAnimationBlend(actions, delta);
    mixer.update(delta);
    pose.apply(actions, delta, 'idle');
  };
  return { model, bones, helper, mixer, actions, pose, initial, step };
}

describe('bounded zombie pose overlay', () => {
  it('preserves live blend clocks, untracked bone poses, root and feet through interruptions', () => {
    const { model, bones, helper, actions, pose, initial, step } = fixture();
    const headBase = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), 0.2);
    bones[2].quaternion.copy(headBase);
    transitionZombieAnimation(actions, null, 'run', initial);
    step(0.04);
    const walkTime = actions.run!.time;
    transitionZombieAnimation(actions, 'run', 'attack', initial);
    step(0.03);
    const liveWeight = actions.run!.getEffectiveWeight();
    transitionZombieAnimation(actions, 'attack', 'run', initial);
    expect(actions.run!.getEffectiveWeight()).toBe(liveWeight);
    expect(actions.run!.time).toBeCloseTo(walkTime + 0.03 * 1.04);
    for (let frame = 0; frame < 600; frame++) {
      step(1 / 60);
      expect(bones[2].quaternion.angleTo(headBase)).toBeLessThan(0.2);
      expect(bones[0].quaternion.angleTo(new Quaternion())).toBeLessThan(0.3);
      expect(helper.quaternion.toArray()).toEqual([0, 0, 0, 1]);
      expect(bones[5].quaternion.toArray()).toEqual([0, 0, 0, 1]);
      expect(model.position.toArray()).toEqual([0, 0, 0]);
    }
    pose.restore();
    expect(bones[2].quaternion.angleTo(headBase)).toBeLessThan(0.000001);
    expect(actions.run!.timeScale).toBe(1.04);
    expect(actions.attack!.timeScale).toBe(1);
    expect(actions.hit!.timeScale).toBe(3);
  });

  it('adds stable per-entity asymmetry and drops the overlay completely at death', () => {
    const a = fixture(0.25);
    const b = fixture(0.75);
    for (const f of [a, b]) {
      transitionZombieAnimation(f.actions, null, 'run', f.initial);
      f.step(0.02);
    }
    expect(a.bones[2].rotation.z).toBeGreaterThan(0);
    expect(b.bones[2].rotation.z).toBeLessThan(0);
    a.pose.hit(1, -1);
    a.pose.struckPlayer();
    transitionZombieAnimation(a.actions, 'run', 'dying', a.initial);
    for (let i = 0; i < 30; i++) a.step(0.02);
    for (const bone of a.bones) expect(bone.quaternion.angleTo(new Quaternion())).toBe(0);
    a.pose.restore();
    expect(a.actions.dying!.time).toBeCloseTo(0.6);
  });

  it('peaks the strike on the accepted damage event and cancels without changing timers', () => {
    vi.useFakeTimers();
    const f = fixture();
    let damage = 0;
    const controller = new ZombieAttackController(WEAK_ZOMBIE_ATTACK, {
      isHitValid: () => true,
      applyDamage: (value) => {
        damage += value;
        f.pose.struckPlayer();
      },
    });
    try {
      transitionZombieAnimation(f.actions, null, 'attack', f.initial);
      controller.update(true, true);
      f.pose.apply(f.actions, 0.12, controller.getPhase());
      const earlyReach = f.bones[0].rotation.x;
      vi.advanceTimersByTime(239);
      expect(damage).toBe(0);
      f.pose.apply(f.actions, 0.119, controller.getPhase());
      expect(f.bones[0].rotation.x).toBeGreaterThan(earlyReach);
      const windupReach = f.bones[0].rotation.x;
      vi.advanceTimersByTime(1);
      f.pose.apply(f.actions, 0.001, controller.getPhase());
      const strike = f.bones[0].rotation.x;
      expect(damage).toBe(5);
      expect(strike).toBeGreaterThan(windupReach);
      for (let frame = 0; frame < 20; frame++)
        f.pose.apply(f.actions, 0.02, controller.getPhase());
      expect(f.bones[0].rotation.x).toBeLessThan(strike);
      controller.cancel();
      vi.advanceTimersByTime(2000);
      expect(damage).toBe(5);
      expect(f.actions.attack!.time).toBe(0);
    } finally {
      controller.dispose();
      vi.useRealTimers();
    }
  });

  it('recoils with accepted strength/direction and restores legitimate skinned shot geometry', () => {
    const f = fixture();
    const geometry = new BufferGeometry();
    geometry.setAttribute(
      'position',
      new Float32BufferAttribute([-1, -1, -3, 1, -1, -3, 0, 1, -3], 3),
    );
    geometry.setAttribute('skinIndex', new Uint16BufferAttribute(new Array(12).fill(0), 4));
    geometry.setAttribute(
      'skinWeight',
      new Float32BufferAttribute([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], 4),
    );
    const mesh = new SkinnedMesh(geometry, new MeshBasicMaterial({ side: DoubleSide }));
    f.model.add(mesh);
    mesh.bind(new Skeleton([f.bones[0]]));
    installCachedShotRaycast(mesh);
    transitionZombieAnimation(f.actions, null, 'hit', f.initial);
    f.pose.hit(1, 1);
    f.step(0.01);
    expect(f.bones[0].rotation.x).toBeLessThan(-0.1);
    expect(f.bones[0].rotation.y).toBeGreaterThan(0);
    f.model.updateMatrixWorld(true);
    const moved = mesh.getVertexPosition(0, new Vector3());
    expect(moved.distanceTo(new Vector3(-1, -1, -3))).toBeGreaterThan(0.2);
    const centroid = new Vector3();
    for (let index = 0; index < 3; index++)
      centroid.add(mesh.getVertexPosition(index, new Vector3()));
    const ray = new Raycaster(new Vector3(), centroid.normalize());
    beginZombieRaycastShot(ray);
    const hit = ray.intersectObject(mesh)[0];
    expect(hit).toBeDefined();
    expect(hit.point.z).not.toBeCloseTo(-3);
    f.pose.restore();
    f.model.updateMatrixWorld(true);
    expect(mesh.getVertexPosition(0, new Vector3()).toArray()).toEqual([-1, -1, -3]);
    mesh.skeleton.dispose();
    geometry.dispose();
    (mesh.material as MeshBasicMaterial).dispose();
  });
});
