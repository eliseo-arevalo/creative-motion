import { Easing, interpolate, spring } from "remotion";

/** Eased 0→1 between two frames (clamped). */
export const ease = (
  frame: number,
  start: number,
  duration: number,
  easing: (t: number) => number = Easing.bezier(0.33, 0, 0.2, 1),
) =>
  interpolate(frame, [start, start + Math.max(1, duration)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });

/** Springy 0→1 (may overshoot slightly) used for UI pops. */
export const springIn = (
  frame: number,
  start: number,
  fps: number,
  duration = 24,
) =>
  spring({
    frame: frame - start,
    fps,
    durationInFrames: duration,
    config: { damping: 15, stiffness: 170, mass: 0.8 },
  });

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Gentle ambient drift so nothing is ever a frozen hold. */
export const drift = (frame: number, period = 90, amount = 1) =>
  Math.sin((frame / period) * Math.PI * 2) * amount;
