import emptyFireUrl from '../assets/audio/gun_empty_short.mp3';
import reloadUrl from '../assets/audio/reload.mp3';
import shotgunBlastUrl from '../assets/audio/shotgun_blast_short.mp3';

type AudioFactory = (source: string) => HTMLAudioElement;

const replay = (audio: HTMLAudioElement) => {
  audio.currentTime = 0;
  void audio.play().catch(() => undefined);
};

export class WeaponAudio {
  private readonly emptyFire: HTMLAudioElement;
  private readonly reload: HTMLAudioElement;
  private readonly shotgunBlast: HTMLAudioElement;

  constructor(createAudio: AudioFactory = (source) => new Audio(source)) {
    this.emptyFire = createAudio(emptyFireUrl);
    this.reload = createAudio(reloadUrl);
    this.shotgunBlast = createAudio(shotgunBlastUrl);
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
}
