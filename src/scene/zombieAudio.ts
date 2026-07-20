import zombieBitingUrl from '../assets/audio/zombie_biting.mp3';

type AudioFactory = (source: string) => HTMLAudioElement;

const replay = (audio: HTMLAudioElement) => {
  audio.currentTime = 0;
  void audio.play().catch(() => undefined);
};

export class ZombieAttackAudio {
  private readonly bite: HTMLAudioElement;
  private attacking = false;

  constructor(createAudio: AudioFactory = (source) => new Audio(source)) {
    this.bite = createAudio(zombieBitingUrl);
  }

  enterAttack() {
    if (this.attacking) return;
    this.attacking = true;
    replay(this.bite);
  }

  synchronizeAttackCycle() {
    if (!this.attacking) return;
    replay(this.bite);
  }

  leaveAttack() {
    if (!this.attacking) return;
    this.attacking = false;
    this.bite.pause();
    this.bite.currentTime = 0;
  }

  stop() {
    this.attacking = false;
    this.bite.pause();
    this.bite.currentTime = 0;
  }
}
