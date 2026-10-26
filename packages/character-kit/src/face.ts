import { clamp, clamp01, hash, lerp, smooth } from "./math";
import type { ExpressionMix, ExpressionName, FaceKey, FaceParams, LookKey, LookTarget } from "./types";

export const NEUTRAL: FaceParams = {
  browY: 0,
  browTilt: 0,
  browAsym: 0,
  lidTop: 0.08,
  lidBottom: 0,
  eyeScale: 1,
  smile: 0.12,
  open: 0,
  wide: 0,
  round: 0,
  teeth: 0,
  pressed: 0,
  mouthX: 0,
  blush: 0.3,
  gazeX: 0,
  gazeY: 0,
};

/** Expression presets (full parameter sets; mixed as deltas from NEUTRAL). */
export const EXPRESSIONS: Record<ExpressionName, FaceParams> = {
  neutral: NEUTRAL,
  happy: { ...NEUTRAL, browY: 5, browTilt: -0.1, lidTop: 0, lidBottom: 0.5, smile: 1, open: 0.38, wide: 0.3, teeth: 1, blush: 0.65 },
  /** Problem face: brows up in the middle, corners DOWN (never a smile). */
  worried: { ...NEUTRAL, browY: 3, browTilt: 1, lidTop: 0.14, smile: -0.6, wide: -0.25, pressed: 0.35, blush: 0.2, gazeY: 2 },
  /** "Otra vez…": heavy lids, flat pressed line, brows level and low. */
  deadpan: { ...NEUTRAL, browY: -3, browTilt: -0.1, lidTop: 0.42, smile: -0.1, wide: -0.12, pressed: 0.6, blush: 0.15 },
  surprised: { ...NEUTRAL, browY: 13, browTilt: 0.25, lidTop: 0, eyeScale: 1.18, smile: 0, open: 0.62, round: 0.75, wide: -0.2, teeth: 0.2, blush: 0.35 },
  /** Thoughtful / a little worried: eyes up and to the side, inner brows raised (one a touch
      higher), lids open, mouth neutral and slightly pressed. Never a smirk or a squint. */
  /** Angry / fed up: brows down and pulled together (V), glaring lids, corners down, lips pressed. */
  angry: { ...NEUTRAL, browY: -6, browTilt: -1, lidTop: 0.3, lidBottom: 0.22, eyeScale: 0.96, smile: -0.7, wide: -0.08, pressed: 0.7, blush: 0.45 },
  thinking: { ...NEUTRAL, browY: 3, browTilt: 0.55, browAsym: 0.35, lidTop: 0.03, smile: -0.08, wide: -0.2, pressed: 0.12, mouthX: 2, gazeX: -6, gazeY: -6, blush: 0.2 },
};

const KEYS = Object.keys(NEUTRAL) as (keyof FaceParams)[];

/** Mix expressions: NEUTRAL + Σ weight × (preset − NEUTRAL). */
export const mixExpressions = (mix: ExpressionMix | ExpressionName): FaceParams => {
  const m: ExpressionMix = typeof mix === "string" ? { [mix]: 1 } : mix;
  const out = { ...NEUTRAL };
  for (const [name, w] of Object.entries(m) as [ExpressionName, number][]) {
    if (!w || name === "neutral") continue;
    const e = EXPRESSIONS[name];
    for (const k of KEYS) out[k] += (e[k] - NEUTRAL[k]) * w;
  }
  return out;
};

const lerpFace = (a: FaceParams, b: FaceParams, t: number) => {
  const out = { ...a };
  for (const k of KEYS) out[k] = lerp(a[k], b[k], t);
  return out;
};

/** Expression at a frame from keys (each eases in over `ease` frames, default 7). */
export const faceAt = (keys: FaceKey[] | undefined, frame: number): FaceParams => {
  if (!keys || keys.length === 0) return NEUTRAL;
  let f = mixExpressions(keys[0].mix);
  for (let i = 1; i < keys.length; i++) {
    if (frame < keys[i].at) break;
    f = lerpFace(f, mixExpressions(keys[i].mix), smooth(frame, keys[i].at, keys[i].ease ?? 7));
  }
  return f;
};

/**
 * Automatic blinking: irregular gaps (2.2–4.4 s), sometimes a double blink.
 * Returns lid closure 0…1. Deterministic per seed.
 */
export const blinkAt = (frame: number, seed = 0, fps = 30) => {
  const profile = [0.45, 1, 1, 0.65, 0.3, 0.08];
  let t = Math.round(fps * 0.6 + hash(seed) * fps);
  for (let i = 0; i < 400 && t <= frame; i++) {
    const d = frame - t;
    if (d < profile.length) return profile[d];
    const dbl = hash(seed * 13 + i * 7) > 0.8;
    if (dbl && d >= 8 && d < 8 + profile.length) return profile[d - 8];
    const gap = Math.round(fps * (2.2 + hash(seed * 31 + i) * 2.2));
    if (frame < t + gap) return 0;
    t += gap;
  }
  return 0;
};

const targetPoint = (t: LookTarget, head: { x: number; y: number }) => (t === "camera" ? { x: head.x, y: head.y } : t);

/**
 * Look-at: direction from the head to the target → pupil offset, a small head turn
 * (feature shift, fakes 3/4) and a head tilt toward it. Targets in canvas px.
 */
export const lookAt = (keys: LookKey[] | undefined, frame: number, head: { x: number; y: number }) => {
  if (!keys || keys.length === 0) return { px: 0, py: 0, turn: 0, tilt: 0 };
  let p = targetPoint(keys[0].target, head);
  for (let i = 1; i < keys.length; i++) {
    if (frame < keys[i].at) break;
    const q = targetPoint(keys[i].target, head);
    // Eyes lead quickly; the result is eased so saccades still read as a dart.
    const t = smooth(frame, keys[i].at, 5);
    p = { x: lerp(p.x, q.x, t), y: lerp(p.y, q.y, t) };
  }
  const dx = p.x - head.x;
  const dy = p.y - head.y;
  const dist = Math.hypot(dx, dy);
  const reach = clamp01(dist / 260);
  const nx = dist > 0 ? dx / dist : 0;
  const ny = dist > 0 ? dy / dist : 0;
  return {
    px: nx * 6 * reach,
    py: ny * 5 * reach,
    turn: clamp(dx / 30, -8, 8),
    tilt: clamp(dx / 90, -4, 4),
  };
};
