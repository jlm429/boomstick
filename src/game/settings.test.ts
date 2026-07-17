import { beforeEach, describe, expect, it } from 'vitest';
import { INVERT_Y_STORAGE_KEY, readInvertYSetting, writeInvertYSetting } from './settings';

describe('input settings', () => {
  beforeEach(() => localStorage.clear());

  it('defaults to non-inverted vertical look and persists changes', () => {
    expect(readInvertYSetting()).toBe(false);
    writeInvertYSetting(true);
    expect(localStorage.getItem(INVERT_Y_STORAGE_KEY)).toBe('true');
    expect(readInvertYSetting()).toBe(true);
    writeInvertYSetting(false);
    expect(readInvertYSetting()).toBe(false);
  });
});
