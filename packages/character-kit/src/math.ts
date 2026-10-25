import { spring } from "remotion";

export const rad = (deg: number) => (deg * Math.PI) / 180;
export const deg = (r: number) => (r * 180) / Math.PI;
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const clamp01 = (v: number) => clamp(v, 0, 1);
/** Smoothstep 0→1 over [start, start + dur]. */
export const smooth = (x: number, start: number, dur: number) => {
  const t = clamp01((x - start) / Math.max(1e-6, dur));
  return t * t * (3 - 2 * t);
};
/** Wrap an angle to (-180, 180]. */
export const wrap = (a: number) => {
  let x = ((a + 180) % 360 + 360) % 360 - 180;
  if (x === -180) x = 180;
  return x;
};
/** Deterministic 0…1 noise from an integer. */
export const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
/** Slow organic drift (sum of two sines), amplitude `amp`. */
export const drift = (frame: number, period: number, amp: number) =>
  (Math.sin((frame / period) * Math.PI * 2) * 0.65 + Math.sin((frame / (period * 0.61)) * Math.PI * 2 + 1.3) * 0.35) * amp;

export type SpringFeel = { damping: number; stiffness: number; mass: number };
/** Under-damped: overshoots ~8 % and settles (cartoon follow-through). */
export const SNAPPY: SpringFeel = { damping: 11, stiffness: 120, mass: 0.7 };

/**
 * Pose transition curve: a short anticipation (moves `antic` the other way first),
 * then an under-damped spring that overshoots and settles. Returns the blend t (can be <0 / >1)
 * and the anticipation amount (0…1) so the body can dip into it.
 */
export const transition = (dt: number, fps: number, antic = 0.12, feel: SpringFeel = SNAPPY) => {
  if (dt <= 0) return { t: 0, dip: 0 };
  const a = dt < 7 ? antic * Math.sin((Math.PI * dt) / 7) : 0;
  const main = dt > 3 ? spring({ frame: dt - 3, fps, config: feel }) : 0;
  return { t: main - a, dip: antic > 0 ? a / antic : 0 };
};
