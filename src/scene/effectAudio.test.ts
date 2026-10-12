import { describe, expect, it, vi } from 'vitest';
import { EffectAudio, type EffectOwner } from './effectAudio';
import { setupEffectAudio } from './effectAudio.test-support';

const owner = (): EffectOwner => new Map();

describe('short-effect audio runtime', () => {
  it('constructs no browser resources before activation and caches all six decodes across gestures', async () => {
    const { audio, createContext, fetchAsset, context, ready } = setupEffectAudio();
    expect(createContext).not.toHaveBeenCalled();
    await ready();
    audio.activate();
    expect(createContext).toHaveBeenCalledOnce();
    expect(context.resume).toHaveBeenCalledTimes(2);
    expect(fetchAsset).toHaveBeenCalledTimes(6);
    expect(context.decodeAudioData).toHaveBeenCalledTimes(6);
  });

  it('drops cold and suspended triggers instead of replaying them after readiness or resume', async () => {
    const { audio, sources, context, ready } = setupEffectAudio();
    const weapon = owner();
    audio.setEnabled(true);
    audio.play(weapon, 'shot');
    await ready();
    expect(sources).toHaveLength(0);
    context.state = 'suspended';
    audio.play(weapon, 'shot');
    audio.activate();
    await Promise.resolve();
    expect(sources).toHaveLength(0);
    audio.play(weapon, 'shot');
    expect(sources).toHaveLength(1);
  });

  it('replaces only the same owner and sound, retaining independent effect and zombie overlap', async () => {
    const { audio, sources, gains, ready } = setupEffectAudio();
    await ready();
    const weapon = owner(),
      first = owner(),
      second = owner();
    audio.play(weapon, 'shot');
    const oldEnded = sources[0].onended!;
    audio.play(weapon, 'wall', 0.4);
    audio.play(first, 'bite');
    audio.play(second, 'bite');
    audio.play(weapon, 'shot');
    expect(sources[0].stop).toHaveBeenCalledOnce();
    expect(sources.slice(1).every((s) => s.stop.mock.calls.length === 0)).toBe(true);
    expect(gains[1].gain.value).toBe(0.4);
    oldEnded();
    expect(weapon.size).toBe(2);
    audio.stop(first);
    expect(sources[2].stop).toHaveBeenCalledOnce();
    expect(sources[3].stop).not.toHaveBeenCalled();
    expect(first.size).toBe(0);
    sources[1].onended!();
    expect(weapon.size).toBe(1);
    expect(sources[1].disconnect).toHaveBeenCalledOnce();
    expect(gains[1].disconnect).toHaveBeenCalledOnce();
  });

  it('bounds repeated voices and stops all sounds on pause, interruption, restart, background, and close', async () => {
    const { audio, context, sources, ready } = setupEffectAudio();
    await ready();
    const weapon = owner();
    for (let i = 0; i < 20; i++) audio.play(weapon, 'shot');
    expect(weapon.size).toBe(1);
    audio.setEnabled(false);
    expect(weapon.size).toBe(0);
    audio.play(weapon, 'shot');
    expect(sources).toHaveLength(20);
    audio.setEnabled(true);
    audio.play(weapon, 'shot');
    context.state = 'interrupted';
    context.onstatechange!();
    expect(weapon.size).toBe(0);
    audio.activate();
    audio.play(weapon, 'shot');
    audio.stopAll();
    expect(weapon.size).toBe(0);
    audio.play(weapon, 'reload');
    audio.suspend();
    expect(weapon.size).toBe(0);
    expect(context.suspend).toHaveBeenCalledOnce();
    audio.close();
    expect(context.close).toHaveBeenCalledOnce();
    expect(context.onstatechange).toBeNull();
    expect(sources.every((s) => s.stop.mock.calls.length === 1)).toBe(true);
  });

  it('aborts loading on close and cannot populate a new session from a late decode', async () => {
    const { context, reportError } = setupEffectAudio();
    const decodes: ((buffer: AudioBuffer) => void)[] = [];
    context.decodeAudioData.mockImplementation(
      () => new Promise((resolve) => decodes.push(resolve)),
    );
    const signals: AbortSignal[] = [];
    const fetchAsset = vi.fn(async (_url, options) => {
      signals.push(options.signal);
      return { ok: true, arrayBuffer: async () => new ArrayBuffer(1) } as Response;
    });
    const audio = new EffectAudio(
      () => context as unknown as AudioContext,
      fetchAsset as typeof fetch,
      reportError,
    );
    audio.activate();
    await vi.waitFor(() => expect(decodes).toHaveLength(6));
    audio.close();
    expect(signals.every((signal) => signal.aborted)).toBe(true);
    decodes.forEach((resolve) => resolve({} as AudioBuffer));
    await Promise.resolve();
    audio.activate();
    audio.setEnabled(true);
    audio.play(owner(), 'shot');
    expect(context.createBufferSource).not.toHaveBeenCalled();
    expect(reportError).not.toHaveBeenCalled();
  });

  it('handles rejected activation and failed assets without unhandled promises or delayed playback', async () => {
    const { audio, context, fetchAsset, reportError, sources } = setupEffectAudio();
    context.resume.mockRejectedValueOnce(new Error('Blocked'));
    fetchAsset.mockRejectedValue(new Error('Offline'));
    audio.activate();
    await vi.waitFor(() => expect(reportError).toHaveBeenCalledTimes(7));
    audio.setEnabled(true);
    audio.play(owner(), 'shot');
    expect(sources).toHaveLength(0);
  });
});
