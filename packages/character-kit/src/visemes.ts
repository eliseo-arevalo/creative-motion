import { clamp01, lerp } from "./math";
import type { MouthCue, MouthShape, SpeechClip, Viseme } from "./types";

/**
 * Rhubarb shapes → mouth parameters.
 * A: M B P (closed, pressed) · B: most consonants, teeth together, lips a bit open · C: EH, AE
 * D: AA (wide open) · E: AO, ER (slightly rounded) · F: UW, OW, W (puckered) · G: F, V (teeth on lip)
 * H: L (tongue up) · X: rest.
 */
export const VISEMES: Record<Viseme, MouthShape> = {
  A: { open: 0, wide: -0.05, round: 0, teeth: 0, tongue: 0, bite: 0, pressed: 1 },
  B: { open: 0.17, wide: 0.22, round: 0, teeth: 1, tongue: 0, bite: 0, pressed: 0 },
  C: { open: 0.42, wide: 0.18, round: 0, teeth: 0.7, tongue: 0.2, bite: 0, pressed: 0 },
  D: { open: 0.82, wide: 0.24, round: 0, teeth: 0.5, tongue: 0.5, bite: 0, pressed: 0 },
  E: { open: 0.48, wide: -0.2, round: 0.55, teeth: 0.2, tongue: 0.3, bite: 0, pressed: 0 },
  F: { open: 0.24, wide: -0.55, round: 1, teeth: 0, tongue: 0, bite: 0, pressed: 0 },
  G: { open: 0.16, wide: 0.05, round: 0, teeth: 1, tongue: 0, bite: 1, pressed: 0 },
  H: { open: 0.46, wide: 0.1, round: 0, teeth: 0.6, tongue: 1, bite: 0, pressed: 0 },
  X: { open: 0, wide: 0, round: 0, teeth: 0, tongue: 0, bite: 0, pressed: 0 },
};

const KEYS = Object.keys(VISEMES.X) as (keyof MouthShape)[];
const lerpShape = (a: MouthShape, b: MouthShape, t: number) => {
  const o = { ...a };
  for (const k of KEYS) o[k] = lerp(a[k], b[k], t);
  return o;
};

/** Cross-fade time between shapes (s): fast enough to stay crisp, smooth enough not to flicker. */
const BLEND = 0.05;

const cueIndex = (cues: MouthCue[], t: number) => {
  for (let i = 0; i < cues.length; i++) if (t >= cues[i].start && t < cues[i].end) return i;
  return -1;
};

/**
 * Mouth shape for a frame from one or more speech clips (Rhubarb cues, in seconds from `from`).
 * Returns null when nobody is talking, so the expression owns the mouth.
 */
export const visemeAt = (speech: SpeechClip[] | undefined, frame: number, fps: number): { shape: MouthShape; viseme: Viseme } | null => {
  if (!speech) return null;
  for (const s of speech) {
    const t = (frame - s.from) / fps;
    if (t < 0) continue;
    const i = cueIndex(s.cues, t);
    if (i < 0) continue;
    const cur = s.cues[i];
    if (cur.value === "X" && (i === 0 || i === s.cues.length - 1)) return null;
    const prev = i > 0 ? VISEMES[s.cues[i - 1].value] : VISEMES.X;
    const k = clamp01((t - cur.start) / BLEND);
    return { shape: lerpShape(prev, VISEMES[cur.value], k), viseme: cur.value };
  }
  return null;
};

/** Parse Rhubarb's JSON output (`rhubarb -f json`). */
export const parseRhubarb = (json: { mouthCues: { start: number; end: number; value: string }[] }): MouthCue[] =>
  json.mouthCues.map((c) => ({ start: c.start, end: c.end, value: c.value as Viseme }));
