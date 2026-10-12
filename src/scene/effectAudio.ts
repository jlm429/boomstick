import { EFFECT_URLS, type EffectSound } from './audioAssets';

type Voice = { source: AudioBufferSourceNode; gain: GainNode };
export type EffectOwner = Map<EffectSound, Voice>;

// Construction is inert, including React's discarded Strict Mode initializers.
// The mounted App owns one context, created/resumed directly in entry gestures.
export class EffectAudio {
  private context: AudioContext | null = null;
  private loading = new Map<EffectSound, Promise<void>>();
  private buffers = new Map<EffectSound, AudioBuffer>();
  private owners = new Set<EffectOwner>();
  private abort: AbortController | null = null;
  private enabled = false;

  constructor(
    private readonly createContext = () => new AudioContext(),
    private readonly fetchAsset: typeof fetch = (...args) => fetch(...args),
    private readonly reportError: () => void = () =>
      console.warn('Short-effect audio unavailable'),
  ) {}

  activate() {
    try {
      if (!this.context) {
        const context = this.createContext();
        this.context = context;
        this.abort = new AbortController();
        context.onstatechange = () => {
          if (context.state !== 'running') this.stopAll();
        };
      }
      const context = this.context;
      // Do not await decoding or resume in an input/shot callback or queue sounds.
      void context.resume().catch(this.reportError);
      for (const sound of Object.keys(EFFECT_URLS) as EffectSound[]) {
        if (this.loading.has(sound)) continue;
        const load = this.fetchAsset(EFFECT_URLS[sound], { signal: this.abort!.signal })
          .then((response) => {
            if (!response.ok) throw new Error('Audio fetch failed');
            return response.arrayBuffer();
          })
          .then((data) => context.decodeAudioData(data))
          .then((buffer) => {
            if (this.context === context) this.buffers.set(sound, buffer);
          })
          .catch(() => {
            if (this.context === context) {
              this.loading.delete(sound);
              this.reportError();
            }
          });
        this.loading.set(sound, load);
      }
    } catch {
      this.reportError();
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) this.stopAll();
  }

  resumeActive() {
    if (!this.enabled || !this.context) return;
    void this.context.resume().catch(this.reportError);
  }

  play(owner: EffectOwner, sound: EffectSound, volume = 1, replace = true) {
    const context = this.context;
    const buffer = this.buffers.get(sound);
    if (!this.enabled || !context || context.state !== 'running' || !buffer) return;
    if (owner.has(sound) && !replace) return;
    this.stopSound(owner, sound);
    const source = context.createBufferSource();
    const gain = context.createGain();
    const voice = { source, gain };
    source.buffer = buffer;
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(context.destination);
    source.onended = () => {
      if (owner.get(sound) === voice) {
        owner.delete(sound);
        if (!owner.size) this.owners.delete(owner);
      }
      source.disconnect();
      gain.disconnect();
    };
    owner.set(sound, voice);
    this.owners.add(owner);
    source.start();
  }

  private stopSound(owner: EffectOwner, sound: EffectSound) {
    const voice = owner.get(sound);
    if (!voice) return;
    owner.delete(sound);
    voice.source.onended = null;
    voice.source.stop();
    voice.source.disconnect();
    voice.gain.disconnect();
    if (!owner.size) this.owners.delete(owner);
  }

  stop(owner: EffectOwner) {
    for (const sound of owner.keys()) this.stopSound(owner, sound);
  }

  stopAll() {
    for (const owner of this.owners) this.stop(owner);
  }

  suspend() {
    this.stopAll();
    if (this.context?.state === 'running') void this.context.suspend().catch(this.reportError);
  }

  close() {
    this.stopAll();
    const context = this.context;
    this.context = null;
    this.enabled = false;
    this.abort?.abort();
    this.abort = null;
    this.loading.clear();
    this.buffers.clear();
    if (context) {
      context.onstatechange = null;
      void context.close().catch(this.reportError);
    }
  }
}
