/** Formatos de composición compartidos (fps 30). */

export const FPS = 30 as const;

export const VERTICAL_9_16 = {
  width: 1080,
  height: 1920,
  fps: FPS,
  label: "9:16 vertical",
} as const;

export const HORIZONTAL_16_9 = {
  width: 1920,
  height: 1080,
  fps: FPS,
  label: "16:9 horizontal",
} as const;

export type VideoFormat = typeof VERTICAL_9_16 | typeof HORIZONTAL_16_9;
