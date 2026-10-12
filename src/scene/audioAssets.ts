import empty from '../assets/audio/gun_empty_short.mp3';
import light from '../assets/audio/light_hit_short.mp3';
import reload from '../assets/audio/reload.mp3';
import shot from '../assets/audio/shotgun_blast_short.mp3';
import wall from '../assets/audio/wall_hit_short.mp3';
import bite from '../assets/audio/zombie_biting.mp3';

export const EFFECT_URLS = { empty, light, reload, shot, wall, bite } as const;
export type EffectSound = keyof typeof EFFECT_URLS;
