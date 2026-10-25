import { drift, smooth } from "./math";
import { POSES } from "./poses";
import type { Clip } from "./types";

const TAU = Math.PI * 2;

/**
 * Gesture library: a base pose plus additive keyframed / procedural motion on top.
 * `t` is frames since the clip started. Layers fade in/out with the clip, and each bone reads
 * them with its own delay (wrist after elbow after shoulder), which gives overlap for free.
 */
export const CLIPS = {
  idle: {
    pose: POSES.rest,
    antic: 0.06,
    layer: (t) => ({ x: drift(t, 150, 3), lean: drift(t + 40, 170, 0.6), neck: drift(t + 10, 130, 0.7), head: drift(t + 70, 110, 1.1) }),
  },
  /** ~2 waves a second; the wrist trails the forearm. */
  wave: {
    pose: POSES.wave,
    layer: (t) => {
      const ph = ((t - 6) / 15) * TAU;
      const w = smooth(t, 4, 8);
      return {
        armR: { shoulder: Math.sin(ph - 0.4) * 3 * w, elbow: Math.sin(ph) * 16 * w, wrist: Math.sin(ph - 1.1) * 22 * w },
        head: Math.sin(ph - 1.6) * 1.4 * w,
        x: Math.sin(ph * 0.5) * 1.5 * w,
      };
    },
  },
  /** Point, then a little jab for emphasis. */
  point: {
    pose: POSES.point,
    layer: (t) => {
      const jab = smooth(t, 10, 4) - smooth(t, 15, 8);
      return { armR: { shoulder: jab * 3, elbow: -jab * 8, wrist: jab * 6 }, x: jab * 4, head: drift(t, 90, 0.8) };
    },
  },
  /** Hand to the chin, slow head tilt, fingers tap. */
  think: {
    pose: POSES.think,
    layer: (t) => ({ head: drift(t, 80, 2.2), neck: drift(t + 30, 120, 0.8), armR: { wrist: Math.sin(t / 5) * 3 * smooth(t, 24, 10) } }),
  },
  /** Scratching the head (fast wrist/forearm jitter). */
  scratch: {
    pose: POSES.scratch,
    layer: (t) => {
      const w = smooth(t, 8, 6);
      return { armR: { elbow: Math.sin(t * 1.25) * 6 * w, wrist: Math.sin(t * 1.25 + 1) * 14 * w }, head: Math.sin(t * 1.25 + 2) * 0.6 * w + drift(t, 70, 1) };
    },
  },
  /** One-shot sigh: shoulders rise (inhale), drop lower (exhale), settle. ~50 frames. */
  sigh: {
    pose: POSES.rest,
    antic: 0,
    layer: (t) => {
      const up = smooth(t, 0, 16);
      const down = smooth(t, 18, 14);
      const settle = smooth(t, 34, 18);
      const shrug = up * 12 - down * 18 + settle * 6;
      return { shrug, y: down * 5 - settle * 5, neck: down * 3 - settle * 2, head: down * 4 - settle * 3, lean: -down * 0.6 + settle * 0.6 };
    },
  },
  /** Arms up and little hops. */
  celebrate: {
    pose: POSES.celebrate,
    antic: 0.2,
    layer: (t) => {
      const w = smooth(t, 6, 6);
      const hop = Math.abs(Math.sin((Math.max(0, t - 6) / 11) * Math.PI));
      return {
        y: -hop * 24 * w,
        knees: (1 - hop) * 10 * w,
        armL: { shoulder: Math.sin(t / 3.5) * 7 * w, elbow: Math.sin(t / 3.5 - 0.8) * 10 * w },
        armR: { shoulder: Math.sin(t / 3.5 + 1.4) * 7 * w, elbow: Math.sin(t / 3.5 + 0.6) * 10 * w },
        head: Math.sin(t / 3.5) * 2 * w,
      };
    },
  },
  /** Offer an item: arm extends with a small "aquí tiene" push. */
  give: {
    pose: POSES.give,
    layer: (t) => {
      const push = smooth(t, 8, 6) - smooth(t, 16, 12);
      return { armR: { shoulder: push * 6, elbow: push * 10 }, lean: push * 0.8, head: drift(t, 90, 0.8) };
    },
  },
  /** On the phone: listening nods. */
  phone: {
    pose: POSES.phone,
    layer: (t) => ({ head: Math.sin(t / 7) * 1.6 * smooth(t, 14, 10) + drift(t, 100, 1), lean: drift(t + 20, 140, 0.5) }),
  },
  /** Deadpan: stays put, keeps only micro-motion so the frame never freezes. */
  deadpan: {
    pose: POSES.deadpan,
    antic: 0.04,
    layer: (t) => ({ x: drift(t, 200, 0.8), head: drift(t + 50, 160, 0.4) }),
  },
  akimbo: {
    pose: POSES.akimbo,
    layer: (t) => ({ head: drift(t, 90, 1.5), x: drift(t, 160, 2) }),
  },
  /** Counts 1 → 2 → 3 on the fingers (each finger pops up with a small forearm tap). */
  count: {
    pose: POSES.count,
    layer: (t) => {
      const c2 = smooth(t, 22, 7);
      const c3 = smooth(t, 42, 7);
      const tap = (at: number) => smooth(t, at, 4) - smooth(t, at + 4, 8);
      const nudge = tap(8) + tap(22) + tap(42);
      const hand = t < 22 ? {} : t < 42 ? { hand: "count2" as const, handFrom: "count1" as const, handMix: c2 } : { hand: "count3" as const, handFrom: "count2" as const, handMix: c3 };
      return { armR: { elbow: nudge * 7, wrist: -nudge * 5, ...hand }, head: nudge * 1.2 + drift(t, 90, 0.8) };
    },
  },
  /** Taps the phone screen with the index ("mire, aquí"). */
  pointPhone: {
    pose: POSES.pointPhone,
    layer: (t) => {
      const jab = smooth(t, 12, 4) - smooth(t, 16, 7) + smooth(t, 26, 4) - smooth(t, 30, 7);
      return { armR: { shoulder: -jab * 2, elbow: -jab * 6, wrist: jab * 4 }, head: drift(t, 100, 0.8) };
    },
  },
  /** Cheek in hand; slow head drift and a finger tap on the cheek. */
  cheek: {
    pose: POSES.cheek,
    layer: (t) => ({ head: drift(t, 110, 1.6), neck: drift(t + 40, 140, 0.6), armR: { wrist: Math.sin(t / 6) * 2.5 * smooth(t, 20, 10) } }),
  },
  /**
   * Answering the phone: takes it out of the pocket, glances at the screen, brings it to the ear,
   * talks (nods + small head moves), lowers it again. ~150 frames; steps play in order.
   */
  answerPhone: {
    pose: POSES.phonePocket,
    antic: 0.05,
    steps: [
      { at: 12, pose: POSES.phoneLook },
      { at: 30, pose: POSES.phone },
      { at: 112, pose: POSES.phoneLook },
      { at: 130, pose: POSES.phoneDown },
    ],
    layer: (t) => {
      const talk = smooth(t, 40, 8) - smooth(t, 104, 8);
      return {
        head: (Math.sin(t / 5.5) * 1.8 + Math.sin(t / 2.3) * 0.6) * talk + drift(t, 100, 0.8),
        neck: Math.sin(t / 9 + 1) * 0.8 * talk,
        lean: drift(t + 20, 140, 0.5),
      };
    },
  },
  /** Shrug: up with a little bounce, holds, palms open. */
  shrug: {
    pose: POSES.shrug,
    antic: 0.15,
    layer: (t) => {
      const pop = smooth(t, 2, 5) - smooth(t, 8, 10);
      return { shrug: pop * 6, head: pop * 2 + drift(t, 90, 0.8), armL: { elbow: pop * 6 }, armR: { elbow: pop * 6 } };
    },
  },
} satisfies Record<string, Clip>;

export type ClipName = keyof typeof CLIPS;
