import { describe, expect, it } from 'vitest';
import {
  DESKTOP_CANVAS_DPR,
  TOUCH_CANVAS_DPR,
  canvasDprForTouchControls,
} from './renderQuality';

describe('Canvas DPR selection', () => {
  it('preserves the desktop range and applies the lower cap only to touch capability', () => {
    expect(canvasDprForTouchControls(false)).toBe(DESKTOP_CANVAS_DPR);
    expect(canvasDprForTouchControls(false)).toEqual([1, 1.5]);
    expect(canvasDprForTouchControls(true)).toBe(TOUCH_CANVAS_DPR);
    expect(canvasDprForTouchControls(true)).toEqual([1, 1.25]);
  });
});
