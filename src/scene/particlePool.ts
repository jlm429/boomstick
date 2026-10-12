import { Color } from 'three';
import {
  BLOOD_BURST_SECONDS,
  BLOOD_PARTICLE_COUNT,
  BLOOD_PARTICLE_SIZE,
} from '../game/bloodParticles';
import type { ShotImpactPoint } from '../game/impacts';

export type ParticleKind = 'blood' | 'surface' | 'light';
export const BLOOD_POOL_CAPACITY = BLOOD_PARTICLE_COUNT * 3;
export const SURFACE_POOL_CAPACITY = 72;
export const PARTICLE_MAX_LIFETIME = 0.42;
const blood = new Color('#9f1821');
const dust = new Color('#9c8970');
const spark = new Color('#ffd393');

// Fixed storage, including upload buffers. Overload replaces the oldest slots.
export class ImpactParticlePool {
  readonly positions: Float32Array;
  readonly colors: Float32Array;
  readonly opacity: Float32Array;
  readonly sizes: Float32Array;
  private readonly origins: Float32Array;
  private readonly velocities: Float32Array;
  private readonly ages: Float32Array;
  private readonly lifetimes: Float32Array;
  private cursor = 0;
  activeCount = 0;

  constructor(readonly capacity: number) {
    if (!Number.isInteger(capacity) || capacity <= 0)
      throw new Error('Invalid particle capacity');
    this.positions = new Float32Array(capacity * 3);
    this.colors = new Float32Array(capacity * 3);
    this.origins = new Float32Array(capacity * 3);
    this.velocities = new Float32Array(capacity * 3);
    this.opacity = new Float32Array(capacity);
    this.sizes = new Float32Array(capacity);
    this.ages = new Float32Array(capacity);
    this.lifetimes = new Float32Array(capacity);
  }

  emit(
    kind: ParticleKind,
    point: ShotImpactPoint,
    normal: ShotImpactPoint,
    random: () => number = Math.random,
  ) {
    if (
      !Number.isFinite(point.x) ||
      !Number.isFinite(point.y) ||
      !Number.isFinite(point.z) ||
      !Number.isFinite(normal.x) ||
      !Number.isFinite(normal.y) ||
      !Number.isFinite(normal.z)
    )
      return;
    const count = kind === 'blood' ? BLOOD_PARTICLE_COUNT : kind === 'light' ? 18 : 12;
    for (let index = 0; index < Math.min(count, this.capacity); index++) {
      const slot = this.cursor;
      this.cursor = (slot + 1) % this.capacity;
      const offset = slot * 3;
      const isSpark = kind === 'light' || (kind === 'surface' && index < 4);
      const azimuth = random() * Math.PI * 2;
      const vertical = random() * 2 - 1;
      const radial = Math.sqrt(1 - vertical * vertical);
      const speed = isSpark ? 1.7 + random() * 2 : 0.6 + random() * 1.5;
      this.origins[offset] = point.x + normal.x * 0.025;
      this.origins[offset + 1] = point.y + normal.y * 0.025;
      this.origins[offset + 2] = point.z + normal.z * 0.025;
      this.velocities[offset] = (Math.cos(azimuth) * radial * 0.65 + normal.x) * speed;
      this.velocities[offset + 1] = (vertical * 0.65 + normal.y) * speed + 0.3;
      this.velocities[offset + 2] = (Math.sin(azimuth) * radial * 0.65 + normal.z) * speed;
      this.positions[offset] = this.origins[offset];
      this.positions[offset + 1] = this.origins[offset + 1];
      this.positions[offset + 2] = this.origins[offset + 2];
      (kind === 'blood' ? blood : isSpark ? spark : dust).toArray(this.colors, offset);
      this.sizes[slot] =
        kind === 'blood'
          ? BLOOD_PARTICLE_SIZE * (0.45 + random() * 0.55)
          : isSpark
            ? 0.035
            : 0.08;
      this.ages[slot] = 0;
      this.lifetimes[slot] =
        kind === 'blood'
          ? BLOOD_BURST_SECONDS
          : isSpark
            ? 0.16 + random() * 0.1
            : PARTICLE_MAX_LIFETIME;
      if (this.opacity[slot] === 0) this.activeCount++;
      this.opacity[slot] = 1;
    }
  }

  advance(delta: number, active: boolean) {
    if (!active || !Number.isFinite(delta) || delta <= 0) return;
    // Tab return must not replay a suspended burst.
    if (delta > 0.1) {
      this.clear();
      return;
    }
    for (let slot = 0; slot < this.capacity; slot++) {
      if (this.opacity[slot] === 0) continue;
      const elapsed = (this.ages[slot] += delta);
      if (elapsed >= this.lifetimes[slot]) {
        this.opacity[slot] = 0;
        this.activeCount--;
        continue;
      }
      const travel = (1 - Math.exp(-elapsed * 2.4)) / 2.4;
      const offset = slot * 3;
      for (let axis = 0; axis < 3; axis++) {
        this.positions[offset + axis] =
          this.origins[offset + axis] + this.velocities[offset + axis] * travel;
      }
      this.positions[offset + 1] -= 2.5 * elapsed * elapsed;
      this.opacity[slot] = (1 - elapsed / this.lifetimes[slot]) ** 2;
    }
  }

  clear() {
    this.opacity.fill(0);
    this.activeCount = 0;
    this.cursor = 0;
  }
}
