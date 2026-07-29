import { useEffect, useState } from 'react';
import { supportsTouchControls } from '../game/input';

const COARSE_POINTER_QUERY = '(pointer: coarse)';

const readTouchControlPreference = () =>
  typeof window !== 'undefined' &&
  typeof navigator !== 'undefined' &&
  supportsTouchControls({
    maxTouchPoints: navigator.maxTouchPoints,
    coarsePrimaryPointer:
      typeof window.matchMedia === 'function' &&
      window.matchMedia(COARSE_POINTER_QUERY).matches,
  });

export function useTouchControls() {
  const [enabled, setEnabled] = useState(readTouchControlPreference);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const pointerQuery = window.matchMedia(COARSE_POINTER_QUERY);
    const update = () => setEnabled(readTouchControlPreference());
    update();
    if (typeof pointerQuery.addEventListener === 'function') {
      pointerQuery.addEventListener('change', update);
      return () => pointerQuery.removeEventListener('change', update);
    }
    pointerQuery.addListener(update);
    return () => pointerQuery.removeListener(update);
  }, []);

  return enabled;
}
