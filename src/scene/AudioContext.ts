import { createContext, useContext } from 'react';
import { EffectAudio } from './effectAudio';

export const EffectAudioContext = createContext<EffectAudio | null>(null);

export function useEffectAudio() {
  const audio = useContext(EffectAudioContext);
  if (!audio) throw new Error('Missing effect audio owner');
  return audio;
}
