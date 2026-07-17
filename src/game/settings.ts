export const INVERT_Y_STORAGE_KEY = 'boomstick.invert-y';

export function readInvertYSetting(
  storage: Storage | undefined = globalThis.localStorage,
): boolean {
  return storage?.getItem(INVERT_Y_STORAGE_KEY) === 'true';
}

export function writeInvertYSetting(
  invertY: boolean,
  storage: Storage | undefined = globalThis.localStorage,
) {
  storage?.setItem(INVERT_Y_STORAGE_KEY, String(invertY));
}
