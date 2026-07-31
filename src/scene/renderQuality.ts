export const DESKTOP_CANVAS_DPR: [minimum: number, maximum: number] = [1, 1.5];
export const TOUCH_CANVAS_DPR: [minimum: number, maximum: number] = [1, 1.25];

export const canvasDprForTouchControls = (touchControls: boolean) =>
  touchControls ? TOUCH_CANVAS_DPR : DESKTOP_CANVAS_DPR;
