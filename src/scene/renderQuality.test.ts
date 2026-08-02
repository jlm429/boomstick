import { describe, expect, it } from 'vitest';
import {
  DESKTOP_CANVAS_DPR,
  MOBILE_MAX_PIXEL_RATIO,
  TOUCH_CANVAS_DPR,
  canvasDprForTouchControls,
} from './renderQuality';

describe('Canvas DPR selection', () => {
  it('preserves the desktop range and applies the lower cap only to touch capability', () => {
    expect(canvasDprForTouchControls(false)).toBe(DESKTOP_CANVAS_DPR);
    expect(canvasDprForTouchControls(false)).toEqual([1, 1.5]);
    expect(canvasDprForTouchControls(true)).toBe(TOUCH_CANVAS_DPR);
    expect(MOBILE_MAX_PIXEL_RATIO).toBe(1.25);
    expect(canvasDprForTouchControls(true)).toEqual([1, MOBILE_MAX_PIXEL_RATIO]);
  });
});
