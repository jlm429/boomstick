import type { ShotImpactPoint } from './impacts';

export const BITE_PARTICLE_COUNT = 6;
export const BITE_PARTICLE_SIZE = 0.045;
export const BITE_BURST_SECONDS = 0.18;
export const BITE_BURST_CAMERA_DISTANCE = 0.4;
export const ZOMBIE_BITE_IMPACT_FRACTION = 0.24;

export type BiteParticle = Readonly<{
  velocity: readonly [number, number, number];
}>;

export type BiteBurst = Readonly<{
  id: number;
  origin: ShotImpactPoint;
  particles: readonly BiteParticle[];
}>;

export function createBiteBurst(
  id: number,
  origin: ShotImpactPoint,
  random: () => number = Math.random,
): BiteBurst {
  const particles = Array.from({ length: BITE_PARTICLE_COUNT }, () => {
    const azimuth = random() * Math.PI * 2;
    const vertical = random() * 0.8 - 0.4;
    const horizontal = Math.sqrt(Math.max(0, 1 - vertical * vertical));
    const speed = 0.35 + random() * 0.45;
    return {
      velocity: [
        Math.cos(azimuth) * horizontal * speed,
        vertical * speed,
        Math.sin(azimuth) * horizontal * speed,
      ] as const,
    };
  });

  return { id, origin: { ...origin }, particles };
}

export function didAttackReachBiteImpact(
  previousTime: number,
  currentTime: number,
  animationDuration: number,
) {
  if (
    !Number.isFinite(previousTime) ||
    !Number.isFinite(currentTime) ||
    !Number.isFinite(animationDuration) ||
    previousTime < 0 ||
    currentTime < 0 ||
    animationDuration <= 0
  ) {
    return false;
  }
  const impactTime = animationDuration * ZOMBIE_BITE_IMPACT_FRACTION;
  return previousTime < impactTime && currentTime >= impactTime;
}

export const biteBurstOpacity = (elapsed: number) =>
  Math.max(0, 1 - Math.max(0, elapsed) / BITE_BURST_SECONDS);

export const isBiteBurstComplete = (elapsed: number) =>
  Number.isFinite(elapsed) && elapsed >= BITE_BURST_SECONDS;
