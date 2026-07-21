import type { ShotImpactPoint } from './impacts';

export const BLOOD_PARTICLE_COUNT = 14;
export const BLOOD_PARTICLE_SIZE = 0.11;
export const BLOOD_BURST_SECONDS = 0.32;

export type BloodParticle = Readonly<{
  velocity: readonly [number, number, number];
}>;

export type BloodBurst = Readonly<{
  id: number;
  origin: ShotImpactPoint;
  particles: readonly BloodParticle[];
}>;

export function createBloodBurst(
  id: number,
  origin: ShotImpactPoint,
  random: () => number = Math.random,
): BloodBurst {
  const particles = Array.from({ length: BLOOD_PARTICLE_COUNT }, () => {
    const azimuth = random() * Math.PI * 2;
    const vertical = random() * 1.2 - 0.25;
    const horizontal = Math.sqrt(Math.max(0, 1 - Math.min(1, vertical * vertical)));
    const speed = 1.5 + random() * 2;
    return {
      velocity: [
        Math.cos(azimuth) * horizontal * speed,
        vertical * speed + 0.5,
        Math.sin(azimuth) * horizontal * speed,
      ] as const,
    };
  });

  return { id, origin: { ...origin }, particles };
}

export const bloodBurstOpacity = (elapsed: number) =>
  Math.max(0, 1 - Math.max(0, elapsed) / BLOOD_BURST_SECONDS);

export const isBloodBurstComplete = (elapsed: number) =>
  Number.isFinite(elapsed) && elapsed >= BLOOD_BURST_SECONDS;
