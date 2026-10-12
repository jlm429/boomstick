import { Euler, Quaternion, type Group, type Object3D } from 'three';
import { WEAK_ZOMBIE_ATTACK, type ZombieAttackPhase } from '../game/zombieAttack';
import type { ZombieActions } from './zombieAnimation';

const boneNames = ['Spine', 'Spine2', 'Head', 'LeftArm', 'RightArm'] as const;
const weight = (action: ZombieActions[keyof ZombieActions]) =>
  action?.enabled && action.isScheduled() ? action.getEffectiveWeight() : 0;

// Restore the mixer pose before each update, including bones absent from a clip.
// Only primary bones are changed; duplicate-named skin helper children inherit it.
export class ZombiePoseOverlay {
  private readonly bones: { bone: Object3D; base: Quaternion; index: number }[];
  private readonly rotation = new Euler();
  private readonly offset = new Quaternion();
  private applied = false;
  private windup = 0;
  private strike = 0;
  private recoil = 0;
  private recoilStrength = 0;
  private recoilSide = 0;
  private readonly lean: number;

  constructor(
    model: Group,
    private readonly phase: number,
  ) {
    this.lean = Math.sin(phase * Math.PI * 2);
    this.bones = [];
    boneNames.forEach((name, index) => {
      const bone = model.getObjectByName(`mixamorig${name}`);
      if (bone) this.bones.push({ bone, base: new Quaternion(), index });
    });
  }

  hit(strength: number, side: number) {
    this.recoil = 1;
    this.recoilStrength = 0.65 + Math.min(1, Math.max(0, strength)) * 0.35;
    this.recoilSide = Math.min(1, Math.max(-1, side));
  }

  struckPlayer() {
    this.strike = 1;
  }

  restore() {
    if (!this.applied) return;
    for (const { bone, base } of this.bones) bone.quaternion.copy(base);
    this.applied = false;
  }

  apply(actions: ZombieActions, delta: number, attackPhase: ZombieAttackPhase) {
    this.restore();
    const run = weight(actions.run);
    const attack = weight(actions.attack);
    const living = run + attack + weight(actions.idle);
    const gait = actions.run
      ? (actions.run.time / actions.run.getClip().duration) * Math.PI * 2
      : 0;
    const sway = Math.sin(gait) * 0.65 + Math.sin(gait * 2 + this.phase * 6.28) * 0.35;
    this.windup =
      attackPhase === 'windup'
        ? Math.min(1, this.windup + delta / (WEAK_ZOMBIE_ATTACK.windupMs / 1000))
        : 0;
    const reach = attack * (this.windup * this.windup * 0.7 + this.strike);
    const recoil = this.recoil * this.recoil * this.recoilStrength;
    for (const { bone, base, index } of this.bones) {
      base.copy(bone.quaternion);
      if (index === 0) {
        this.rotation.set(
          living * 0.09 + run * sway * 0.035 + reach * 0.16 - recoil * 0.17,
          run * sway * 0.035 + recoil * this.recoilSide * 0.09,
          living * this.lean * 0.035 + run * sway * 0.055,
        );
      } else if (index === 1) {
        this.rotation.set(living * 0.055 + reach * 0.08, reach * this.lean * 0.045, 0);
      } else if (index === 2) {
        this.rotation.set(
          -living * 0.06 - reach * 0.09 + recoil * 0.12,
          run * Math.sin(gait + 0.8) * 0.055,
          living * this.lean * 0.09 - run * sway * 0.045,
        );
      } else {
        const side = index === 3 ? 1 : -1;
        this.rotation.set(
          -reach * (index === 3 ? 0.16 : 0.11),
          side * (run * sway * 0.045 + reach * 0.08),
          side * (run * 0.06 + reach * 0.12),
        );
      }
      this.offset.setFromEuler(this.rotation);
      bone.quaternion.multiply(this.offset);
    }
    this.applied = true;
    this.strike = Math.max(0, this.strike - delta / 0.16);
    this.recoil = Math.max(0, this.recoil - delta / 0.22);
  }
}
