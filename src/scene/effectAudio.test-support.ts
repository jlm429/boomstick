import { vi } from 'vitest';
import { EFFECT_URLS } from './audioAssets';
import { EffectAudio } from './effectAudio';

export const setupEffectAudio = () => {
  const sources: {
    buffer: AudioBuffer | null;
    onended: (() => void) | null;
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
  }[] = [];
  const gains: {
    gain: { value: number };
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  }[] = [];
  const context = {
    state: 'suspended',
    onstatechange: null as (() => void) | null,
    destination: {},
    resume: vi.fn(async () => {
      context.state = 'running';
    }),
    suspend: vi.fn(async () => {
      context.state = 'suspended';
    }),
    close: vi.fn(async () => {
      context.state = 'closed';
    }),
    decodeAudioData: vi.fn(
      async (data: ArrayBuffer) =>
        ({ duration: 1, id: new Uint8Array(data)[0] }) as unknown as AudioBuffer,
    ),
    createBufferSource: vi.fn(() => {
      const source = {
        buffer: null,
        onended: null,
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };
      sources.push(source);
      return source;
    }),
    createGain: vi.fn(() => {
      const gain = { gain: { value: 1 }, connect: vi.fn(), disconnect: vi.fn() };
      gains.push(gain);
      return gain;
    }),
  };
  const fetchAsset = vi.fn(
    async (url: RequestInfo | URL) =>
      ({
        ok: true,
        arrayBuffer: async () =>
          new Uint8Array([Object.values(EFFECT_URLS).indexOf(url as never)]).buffer,
      }) as Response,
  );
  const createContext = vi.fn(() => context as unknown as AudioContext);
  const reportError = vi.fn();
  const audio = new EffectAudio(createContext, fetchAsset as typeof fetch, reportError);
  const ready = async () => {
    audio.activate();
    audio.setEnabled(true);
    await vi.waitFor(() => {
      if (context.decodeAudioData.mock.calls.length !== 6) throw new Error('Not decoded');
    });
    await Promise.resolve();
  };
  return { audio, context, sources, gains, fetchAsset, createContext, reportError, ready };
};
