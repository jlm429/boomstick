export type ZombieAttackConfig = Readonly<{
  damage: number;
  range: number;
  cooldownMs: number;
  windupMs: number;
}>;

export const WEAK_ZOMBIE_ATTACK: ZombieAttackConfig = {
  damage: 5,
  range: 0.8,
  cooldownMs: 1250,
  windupMs: 240,
};

export type ZombieAttackPhase = 'idle' | 'windup' | 'cooldown' | 'disposed';

type TimerHandle = ReturnType<typeof globalThis.setTimeout>;

type AttackScheduler = Readonly<{
  setTimeout: (callback: () => void, delayMs: number) => TimerHandle;
  clearTimeout: (handle: TimerHandle) => void;
}>;

type ZombieAttackCallbacks = Readonly<{
  isHitValid: () => boolean;
  applyDamage: (damage: number) => void;
}>;

const defaultScheduler: AttackScheduler = {
  setTimeout: (callback, delayMs) => globalThis.setTimeout(callback, delayMs),
  clearTimeout: (handle) => globalThis.clearTimeout(handle),
};

export class ZombieAttackController {
  private phase: ZombieAttackPhase = 'idle';
  private enabled = false;
  private inRange = false;
  private timer: TimerHandle | null = null;

  constructor(
    readonly config: ZombieAttackConfig,
    private readonly callbacks: ZombieAttackCallbacks,
    private readonly scheduler: AttackScheduler = defaultScheduler,
  ) {}

  getPhase() {
    return this.phase;
  }

  update(inRange: boolean, enabled: boolean) {
    if (this.phase === 'disposed') return;
    this.inRange = inRange;
    this.enabled = enabled;

    if (!this.canAttack()) {
      if (this.phase === 'windup') this.cancelWindup();
      return;
    }
    if (this.phase === 'idle') this.beginWindup();
  }

  cancel() {
    if (this.phase === 'disposed') return;
    this.enabled = false;
    this.inRange = false;
    this.clearTimer();
    this.phase = 'idle';
  }

  dispose() {
    this.clearTimer();
    this.enabled = false;
    this.inRange = false;
    this.phase = 'disposed';
  }

  private canAttack() {
    return this.enabled && this.inRange && this.callbacks.isHitValid();
  }

  private beginWindup() {
    this.clearTimer();
    this.phase = 'windup';
    this.timer = this.scheduler.setTimeout(() => {
      this.timer = null;
      if (!this.canAttack()) {
        this.phase = 'idle';
        return;
      }
      this.callbacks.applyDamage(this.config.damage);
      this.beginCooldown();
    }, this.config.windupMs);
  }

  private cancelWindup() {
    this.clearTimer();
    this.phase = 'idle';
  }

  private beginCooldown() {
    this.clearTimer();
    this.phase = 'cooldown';
    this.timer = this.scheduler.setTimeout(() => {
      this.timer = null;
      this.phase = 'idle';
      if (this.canAttack()) this.beginWindup();
    }, this.config.cooldownMs);
  }

  private clearTimer() {
    if (this.timer === null) return;
    this.scheduler.clearTimeout(this.timer);
    this.timer = null;
  }
}
