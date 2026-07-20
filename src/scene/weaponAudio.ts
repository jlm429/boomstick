import emptyFireUrl from '../assets/audio/gun_empty_short.mp3';
import lightHitUrl from '../assets/audio/light_hit_short.mp3';
import reloadUrl from '../assets/audio/reload.mp3';
import shotgunBlastUrl from '../assets/audio/shotgun_blast_short.mp3';
import wallHitUrl from '../assets/audio/wall_hit_short.mp3';
import { impactVolumeAtDistance, type ImpactSound } from '../game/impacts';

type AudioFactory = (source: string) => HTMLAudioElement;

const replay = (audio: HTMLAudioElement) => {
  audio.currentTime = 0;
  void audio.play().catch(() => undefined);
};

const stop = (audio: HTMLAudioElement) => {
  audio.pause();
  audio.currentTime = 0;
};

export class WeaponAudio {
  private readonly emptyFire: HTMLAudioElement;
  private readonly lightHit: HTMLAudioElement;
  private readonly reload: HTMLAudioElement;
  private readonly shotgunBlast: HTMLAudioElement;
  private readonly wallHit: HTMLAudioElement;

  constructor(createAudio: AudioFactory = (source) => new Audio(source)) {
    this.emptyFire = createAudio(emptyFireUrl);
    this.lightHit = createAudio(lightHitUrl);
    this.reload = createAudio(reloadUrl);
    this.shotgunBlast = createAudio(shotgunBlastUrl);
    this.wallHit = createAudio(wallHitUrl);
  }

  playEmptyFire() {
    replay(this.emptyFire);
  }

  playReload() {
    if (!this.reload.paused) return;
    replay(this.reload);
  }

  playShotgunBlast() {
    replay(this.shotgunBlast);
  }

  playImpact(sound: ImpactSound, distance: number) {
    const audio = sound === 'light' ? this.lightHit : this.wallHit;
    audio.volume = impactVolumeAtDistance(distance);
    replay(audio);
  }

  stop() {
    stop(this.emptyFire);
    stop(this.lightHit);
    stop(this.reload);
    stop(this.shotgunBlast);
    stop(this.wallHit);
  }
}
