import { EffectAudio, type EffectOwner } from './effectAudio';

export class ZombieAttackAudio {
  private readonly owner: EffectOwner = new Map();

  constructor(private readonly audio: EffectAudio) {}

  playBite() {
    this.audio.play(this.owner, 'bite');
  }

  stop() {
    this.audio.stop(this.owner);
  }
}
