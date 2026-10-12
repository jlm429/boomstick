import { EffectAudio, type EffectOwner } from './effectAudio';

export class ZombieAttackAudio {
  private readonly owner: EffectOwner = new Map();
  private attacking = false;

  constructor(private readonly audio: EffectAudio) {}

  enterAttack() {
    if (this.attacking) return;
    this.attacking = true;
    this.audio.play(this.owner, 'bite');
  }

  synchronizeAttackCycle() {
    if (this.attacking) this.audio.play(this.owner, 'bite');
  }

  leaveAttack() {
    if (this.attacking) this.stop();
  }

  stop() {
    this.attacking = false;
    this.audio.stop(this.owner);
  }
}
