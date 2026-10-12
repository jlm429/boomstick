import { impactVolumeAtDistance, type ImpactSound } from '../game/impacts';
import { EffectAudio, type EffectOwner } from './effectAudio';

export class WeaponAudio {
  private readonly owner: EffectOwner = new Map();

  constructor(private readonly audio: EffectAudio) {}

  playEmptyFire() {
    this.audio.play(this.owner, 'empty');
  }

  playReload() {
    this.audio.play(this.owner, 'reload', 1, false);
  }

  playShotgunBlast() {
    this.audio.play(this.owner, 'shot');
  }

  playImpact(sound: ImpactSound, distance: number) {
    this.audio.play(this.owner, sound, impactVolumeAtDistance(distance));
  }

  stop() {
    this.audio.stop(this.owner);
  }
}
