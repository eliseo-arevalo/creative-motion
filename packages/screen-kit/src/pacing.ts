import type { Pacing } from './types';
// Default durations (frames @30fps) used whenever a timeline entry omits its own.
export const PACING: Record<Pacing, { camera: number; zone: number; cursorMove: number; crossfade: number; calloutIn: number; calloutOut: number; wipe: number; ripple: number }> = {
  snappy: { camera: 16, zone: 24, cursorMove: 18, crossfade: 3, calloutIn: 12, calloutOut: 8, wipe: 10, ripple: 22 },
  gentle: { camera: 36, zone: 40, cursorMove: 26, crossfade: 3, calloutIn: 16, calloutOut: 10, wipe: 14, ripple: 30 },
  calm: { camera: 45, zone: 40, cursorMove: 40, crossfade: 4, calloutIn: 26, calloutOut: 14, wipe: 16, ripple: 34 },
};
export const pacingOf = (p?: Pacing) => PACING[p ?? 'calm'];
