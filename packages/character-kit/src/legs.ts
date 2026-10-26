import { clamp, clamp01, lerp, rad, smooth } from "./math";
import { CANVAS, FOOT_HEIGHT } from "./rig";
import { yawAt } from "./turn";
import type { Pose, PoseKey, Proportions, TurnKey, WalkKey } from "./types";

/**
 * Legs and feet: planted feet (foot lock), a two-bone leg IK in a shallow 3D (x right, u up, z toward
 * the camera, seen from slightly above), heel / toe pivots, a footstep planner for walks and turns.
 * Everything here is a pure function of the keys and the frame (Remotion renders frames in any order).
 */
export const LEGS = {
  /** Body yaw ±1 (`TurnKey`) ↔ this many degrees of real turn. */
  yawDeg: 50,
  /** Toes, and the knees that track over them, turned out (deg). */
  splay: 8,
  /** Ground depth → screen y (camera a little above): a point 100 px nearer draws 22 px lower. */
  depth: 0.22,
  /** Most a supporting leg extends, × (thigh + shin): standing legs look straight, knees never lock. */
  reach: 0.998,
  /** Heel raise (standing) before the foot leaves the ground (deg). */
  heelMax: 24,
  /** How far the hips may sink to keep both feet down: standing / walking, × leg length. */
  sink: 0.03,
  sinkWalk: 0.12,
  /** Walk: heel raise at toe-off, toe raise at heel strike (deg), step lift (× leg length). */
  toeOff: 30,
  heelStrike: 14,
  lift: 0.075,
  /** Swing share of one step's time (the rest is double support). */
  swing: 0.8,
  /**
   * Walk (v7): the knees stay soft (the hips ride this much lower, × leg length) and bob on top of
   * it — lowest just after each heel strike (the "down"), highest as the free leg passes (the "up").
   */
  gaitFlex: 0.02,
  gaitBob: 0.013,
  /** Walk: shoulder swing (deg); the forearm and the hand follow a few frames late. */
  armSwing: 15,
} as const;

export type V3 = { x: number; u: number; z: number };
export type Plant = { x: number; z: number; yaw: number };
type Swing = { t0: number; t1: number; from: Plant; to: Plant; walk: boolean; lift: number; first?: boolean };
type FootPlan = { start: Plant; swings: Swing[] };
type WalkSeg = {
  t0: number;
  t1: number;
  end: number;
  x0: number;
  x1: number;
  dir: 1 | -1;
  n: number;
  S: number;
  face: boolean;
  inPlace: boolean;
  /** v7: hip-bob and arm-swing scales; chained into the walk before / after (no stop between). */
  bounce?: number;
  arms?: number;
  chainIn?: boolean;
  chainOut?: boolean;
};
/** A walking heel strike: when, and this step's own bob / arm-swing variation (cycles are never identical). */
type Land = { t: number; S: number; amp: number; arm: number };
export type FeetPlan = { segs: WalkSeg[]; L: FootPlan; R: FootPlan; lands?: Land[] };

/** Deterministic noise −1…1 (per character seed and per step): walks never repeat exactly. */
const rnd = (seed: number, x: number) => {
  const h = Math.sin(seed * 12.9898 + x * 78.233 + 0.5) * 43758.5453;
  return (h - Math.floor(h)) * 2 - 1;
};
/** A child rig (short legs) bounces a little more. */
const isChild = (p: Proportions) => legLength(p) < 340;

export const legLength = (p: Proportions) => p.thigh + p.shin;

/** Shoe / foot dimensions for a rig (px): length, width, heel / ball / toe distances from the ankle. */
export const footOf = (p: Proportions) => {
  const w = p.legWidth[2];
  const len = w * 3.3;
  return { len, width: w * 1.55, heel: len * 0.24, ball: len * 0.5, toe: len * 0.76, h: FOOT_HEIGHT };
};

/** Screen y of the ground under a foot's contact (the whole figure keeps its old height). */
const groundScreen = (p: Proportions) => CANVAS.ground - footOf(p).len * 0.2 * LEGS.depth;
export const toScreen = (p: Proportions, q: V3) => ({ x: q.x, y: groundScreen(p) - q.u + q.z * LEGS.depth });

/** Hip joint below the hip centre (px): a rest-stance leg is 0.997 × its length (straight, not locked). */
export const hipJointDrop = (p: Proportions) => {
  const L = legLength(p);
  const lat = Math.sin(rad(2)) * L;
  const want = Math.sqrt(Math.max(0, (L * 0.997) ** 2 - lat * lat));
  return groundScreen(p) - FOOT_HEIGHT - (CANVAS.ground - FOOT_HEIGHT - L) - want;
};

/** Knee drop (px) of a `knees` bend in degrees. */
export const kneeDrop = (p: Proportions, knees: number) => {
  const b = rad(clamp(knees, 0, 120) * 1.5);
  const d = Math.sqrt(p.thigh ** 2 + p.shin ** 2 + 2 * p.thigh * p.shin * Math.cos(b));
  return legLength(p) - d;
};

/** Ankle of a foot planted at `pl` (ground point under the ankle when flat), pitched by `pitch` (+ toe up) round the heel or the ball. */
export const ankleOf = (p: Proportions, pl: Plant, pitch: number) => {
  const f = footOf(p);
  const bp = pitch > 0 ? -f.heel : pitch < 0 ? f.ball : 0;
  const th = rad(pitch);
  const sy = Math.sin(rad(pl.yaw));
  const cy = Math.cos(rad(pl.yaw));
  const b = -bp * Math.cos(th) - f.h * Math.sin(th);
  const h = -bp * Math.sin(th) + f.h * Math.cos(th);
  return { x: pl.x + (bp + b) * sy, u: h, z: pl.z + (bp + b) * cy };
};

/** Point of the foot (a lateral, b forward from the ankle, h up from the sole) for an ankle, pitch and yaw. */
export const footPoint = (p: Proportions, ankle: V3, pitch: number, yaw: number, a: number, b: number, h: number): V3 => {
  const f = footOf(p);
  // Heel up: the toes bend at the ball and stay flat on the ground (the shoe creases there).
  if (pitch < 0 && b > f.ball) {
    const ball = footPoint(p, ankle, pitch, yaw, a, f.ball, 0);
    const sy = Math.sin(rad(yaw));
    const cy = Math.cos(rad(yaw));
    const k = b - f.ball;
    return { x: ball.x + k * sy, u: ball.u + h * (1 - k / (f.toe - f.ball + 1e-6) * 0.25), z: ball.z + k * cy };
  }
  const th = rad(pitch);
  const bb = b * Math.cos(th) - (h - f.h) * Math.sin(th);
  const hh = b * Math.sin(th) + (h - f.h) * Math.cos(th);
  const sy = Math.sin(rad(yaw));
  const cy = Math.cos(rad(yaw));
  return { x: ankle.x + a * cy + bb * sy, u: ankle.u + hh, z: ankle.z - a * sy + bb * cy };
};

/* ─────────────── Planner ─────────────── */

/** Trapezoid speed profile 0→1 (speeds up over the first half step, slows over the last). */
const profile = (u: number, n: number) => {
  const a = Math.min(0.5, 0.5 / n);
  const v = 1 / (1 - a);
  const x = clamp01(u);
  if (x < a) return (v * x * x) / (2 * a);
  if (x <= 1 - a) return v * (x - a / 2);
  return 1 - (v * (1 - x) ** 2) / (2 * a);
};

const walkSegs = (walk: WalkKey[] | undefined, fps: number, p: Proportions): WalkSeg[] => {
  const out: WalkSeg[] = [];
  let x = 0;
  let free = -Infinity;
  for (const k of [...(walk ?? [])].sort((a, b) => a.at - b.at)) {
    const D = k.to - x;
    if (Math.abs(D) < 1) continue;
    const S = Math.max(8, Math.round(fps / (k.cadence ?? 2)));
    const n = Math.max(1, Math.ceil(Math.abs(D) / ((k.stride ?? 0.42) * legLength(p))));
    const prev = out[out.length - 1];
    // `chain`: keyed before the walk ahead has stopped → it hands over its last step (a turn mid-walk).
    const chainIn = !!k.chain && !!prev && prev.n >= 2 && prev.inPlace === !!k.inPlace && k.at <= free;
    if (chainIn && prev) {
      prev.chainOut = true;
      prev.end = prev.t1 - prev.S + Math.round(LEGS.swing * prev.S);
    }
    const t0 = chainIn && prev ? prev.t1 : Math.max(k.at, free);
    const t1 = t0 + n * S;
    const end = t1 + Math.round(LEGS.swing * S);
    const bounce = (k.bounce ?? 1) * (isChild(p) ? 1.3 : 1);
    out.push({ t0, t1, end, x0: x, x1: k.to, dir: D > 0 ? 1 : -1, n, S, face: k.face !== false, inPlace: !!k.inPlace, bounce, arms: k.arms ?? 1, chainIn });
    x = k.to;
    free = end + 2;
  }
  return out;
};

const segX = (s: WalkSeg, t: number) => s.x0 + (s.x1 - s.x0) * profile((t - s.t0) / (s.t1 - s.t0), s.n);

/**
 * Spacing on top of the speed profile (v7): the body slows just after each heel strike (the down,
 * the knee takes the weight) and speeds through the passing; after the last step it carries on a
 * little and settles back over the feet (no dead stop).
 */
const gaitX = (s: WalkSeg, t: number) => {
  const step = Math.abs(s.x1 - s.x0) / s.n;
  const sw = Math.round(LEGS.swing * s.S);
  const env = smooth(t, s.t0 + sw * 0.5, s.S) * (1 - smooth(t, s.t1 - s.S * 1.5, s.S));
  let o = -step * 0.035 * Math.sin(2 * Math.PI * ((t - s.t0 - sw) / s.S - 0.15)) * env;
  if (!s.chainOut) {
    const u = (t - s.t1) / (s.S * 1.6);
    if (u > 0 && u < 1) o += Math.min(step, 160) * 0.07 * Math.sin(Math.PI * u) * (1 - u);
  }
  return o * s.dir;
};

/** Hip offset (canvas px) walked so far at a frame: add it to a parent's x when `inPlace`. */
export const walkOffset = (walk: WalkKey[] | undefined, frame: number, fps: number, p: Proportions) => bodyXOf(walkSegs(walk, fps, p), frame);
const bodyXOf = (segs: WalkSeg[], t: number) => {
  let x = 0;
  for (const s of segs) {
    if (t < s.t0) break;
    x = (t >= s.t1 ? s.x1 : segX(s, t)) + gaitX(s, t);
  }
  return x;
};

/**
 * 0…1: how much the body faces its walking direction (turns in before the first step, back after
 * the last). Overlapping walks blend their directions, so a turn mid-walk pivots through the camera.
 */
const faceOf = (segs: WalkSeg[], t: number) => {
  let sum = 0;
  let mix = 0;
  for (const s of segs) {
    if (!s.face) continue;
    const on = s.chainIn ? smooth(t, s.t0 - s.S * 0.6, s.S * 0.9) : smooth(t, s.t0 - 6, 8);
    const off = s.chainOut ? smooth(t, s.t1 - s.S * 0.6, s.S * 0.9) : smooth(t, s.end - 2, 12);
    const k = on * (1 - off);
    sum += k;
    mix += k * s.dir;
  }
  return sum > 1e-9 ? { w: Math.min(1, sum), dir: mix / sum } : { w: 0, dir: 0 };
};

/** Walking weight of one walk at a frame (eases in from the weight shift before the first step). */
const walkW = (s: WalkSeg, t: number) =>
  (s.chainIn ? 1 : smooth(t, s.t0 - 8, 10)) * (s.chainOut ? 1 - smooth(t, s.t1 + 1, 3) : 1 - smooth(t, s.end - 4, 10));

/** The walk in effect at a frame (the strongest), and the blended direction (−1…1) of all of them. */
const walkState = (segs: WalkSeg[], t: number) => {
  let w = 0;
  let seg: WalkSeg | undefined;
  let sum = 0;
  let mix = 0;
  for (const s of segs) {
    if (t < s.t0 - 9 || t > s.end + 8) continue;
    const k = walkW(s, t);
    sum += k;
    mix += k * s.dir;
    if (k >= w && k > 0) {
      w = k;
      seg = s;
    }
  }
  return { w, dir: (seg?.dir ?? 0) as 1 | -1 | 0, seg, mix: sum > 1e-9 ? mix / sum : 0 };
};

/** Body and head yaw (−1…1, as `TurnKey`) with the walk's own turn mixed in. */
export const yawsAt = (turn: TurnKey[] | undefined, walk: WalkKey[] | undefined, frame: number, fps: number, p: Proportions, segs = walkSegs(walk, fps, p)) => {
  const fb = faceOf(segs, frame);
  const fh = faceOf(segs, frame + 3);
  const body = lerp(yawAt(turn, frame - 3, fps) * 0.75, fb.dir * 0.75, fb.w);
  const head = lerp(yawAt(turn, frame, fps), fh.dir, fh.w);
  return { body, head };
};

/** Walking amount 0…1 and direction at a frame. */
export const walkingAt = (walk: WalkKey[] | undefined, frame: number, fps: number, p: Proportions, segs = walkSegs(walk, fps, p)) => {
  const st = walkState(segs, frame);
  return { w: st.w, dir: st.dir, seg: st.seg, mix: st.mix };
};

/**
 * Gait phase at a frame: 0 at a heel strike, ~0.15 the down, ~0.6 the passing, 1 the next strike;
 * with this step's own bob / arm-swing variation.
 */
export const gaitAt = (plan: FeetPlan, t: number) => {
  const ls = plan.lands ?? [];
  if (!ls.length) return { phase: 0, amp: 1, arm: 1 };
  let i = -1;
  for (let k = 0; k < ls.length; k++) if (ls[k].t <= t) i = k;
  let a = ls[i];
  let b = ls[i + 1];
  if (!a || (b && b.t - a.t > b.S * 1.6 && t - a.t > (b.t - a.t) / 2)) a = { ...b, t: b.t - b.S };
  if (!b || b.t - a.t > a.S * 1.6) b = { ...a, t: a.t + a.S };
  const u = clamp01((t - a.t) / Math.max(1, b.t - a.t));
  return { phase: u, amp: lerp(a.amp, b.amp, u), arm: lerp(a.arm, b.arm, u) };
};

/** Stance widths from a pose's leg angles: lateral distance of each foot from the midline (px). */
const stanceOf = (p: Proportions, pose: Pose) => ({
  L: p.legGap + Math.sin(rad(pose.legL)) * legLength(p),
  R: p.legGap + Math.sin(rad(pose.legR)) * legLength(p),
});

/** Where a foot stands for a body centre, yaw (deg) and lateral offset. */
const standPlant = (side: 1 | -1, x: number, yawDeg: number, a: number): Plant => ({
  x: x + side * a * Math.cos(rad(yawDeg)),
  z: -side * a * Math.sin(rad(yawDeg)),
  yaw: yawDeg + side * LEGS.splay,
});

const plantGap = (a: Plant, b: Plant) => Math.max(Math.hypot(a.x - b.x, a.z - b.z), Math.abs(a.yaw - b.yaw) * 0.5);

/**
 * Footsteps for the whole shot: the walk's gait, plus small pivot steps when the body turns or
 * the stance changes while standing. Feet move only while lifted (never slide on the ground).
 */
export const planFeet = (keys: PoseKey[] | undefined, turn: TurnKey[] | undefined, walk: WalkKey[] | undefined, fps: number, p: Proportions, stancePose: (k: PoseKey) => Pose, seed = 0): FeetPlan => {
  const segs = walkSegs(walk, fps, p);
  const L = legLength(p);
  const keyList = keys && keys.length > 0 ? keys : [];
  const stanceAt = (t: number) => {
    let s = stanceOf(p, keyList.length ? stancePose(keyList[0]) : ({ legL: 2, legR: 2 } as Pose));
    for (const k of keyList) if (k.at <= t) s = stanceOf(p, stancePose(k));
    return s;
  };
  const yawDegAt = (t: number) => yawsAt(turn, walk, t, fps, p, segs).body * LEGS.yawDeg;
  const st0 = stanceAt(-Infinity);
  const y0 = yawDegAt(-1e6);
  const feet: Record<"L" | "R", FootPlan> = {
    L: { start: standPlant(-1, 0, y0, st0.L), swings: [] },
    R: { start: standPlant(1, 0, y0, st0.R), swings: [] },
  };
  const cur = (k: "L" | "R") => (feet[k].swings.length ? feet[k].swings[feet[k].swings.length - 1].to : feet[k].start);
  const freeAt = (k: "L" | "R") => (feet[k].swings.length ? feet[k].swings[feet[k].swings.length - 1].t1 : -Infinity);
  const add = (k: "L" | "R", t0: number, dur: number, to: Plant, walkStep: boolean, lift: number, first = false) => {
    const s = Math.max(t0, freeAt(k));
    feet[k].swings.push({ t0: s, t1: s + dur, from: cur(k), to, walk: walkStep, lift, ...(first ? { first } : {}) });
    return s + dur;
  };
  const lands: Land[] = [];
  // This character's own walk: a touch more / less bounce and arm swing (from its seed).
  const own = { amp: 1 + 0.1 * rnd(seed, 0.37), arm: 1 + 0.12 * rnd(seed, 0.71) };
  let nextSide: "L" | "R" | undefined;
  /** Pivot steps (standing) toward the stance for body x, yaw and widths: the foot that is further off goes first. */
  const shuffle = (t: number, x: number, yawDeg: number, st: { L: number; R: number }) => {
    const want = { L: standPlant(-1, x, yawDeg, st.L), R: standPlant(1, x, yawDeg, st.R) };
    const off = { L: plantGap(cur("L"), want.L), R: plantGap(cur("R"), want.R) };
    const order = (off.L >= off.R ? ["L", "R"] : ["R", "L"]) as ("L" | "R")[];
    let at = t;
    for (const k of order) {
      if (off[k] < 3) continue;
      const dur = Math.round(clamp(7 + off[k] / 6, 8, 12));
      // The second foot lifts as the first lands: one foot is always down (a pivot, not a hop).
      at = add(k, at, dur, want[k], false, L * clamp(0.02 + off[k] / 900, 0.02, 0.05));
    }
  };
  type Ev = { t: number; kind: "walk"; seg: WalkSeg } | { t: number; kind: "shuffle" };
  const evs: Ev[] = segs.map((seg) => ({ t: seg.t0, kind: "walk" as const, seg }));
  for (const k of turn ?? []) evs.push({ t: k.at + 3, kind: "shuffle" });
  keyList.forEach((k, i) => {
    if (i > 0) evs.push({ t: k.at, kind: "shuffle" });
  });
  for (const s of segs) evs.push({ t: s.end + 3, kind: "shuffle" });
  evs.sort((a, b) => a.t - b.t);
  for (const ev of evs) {
    if (ev.kind === "shuffle") {
      if (segs.some((s) => ev.t >= s.t0 - 2 && ev.t <= s.end)) continue;
      // Settle on where the turn / stance is heading (a turn springs in over ~20 frames).
      shuffle(ev.t, bodyXOf(segs, ev.t), yawDegAt(ev.t + 20), stanceAt(ev.t));
      continue;
    }
    const s = ev.seg;
    const st = stanceAt(s.t0);
    const step = (s.x1 - s.x0) / s.n;
    const sw = Math.round(LEGS.swing * s.S);
    let side: "L" | "R" = s.chainIn && nextSide ? nextSide : s.dir > 0 ? "L" : "R";
    // A walk that hands over to the next one (chain) skips its closing step.
    const steps = s.chainOut ? s.n - 1 : s.n;
    for (let k = 0; k <= steps; k++) {
      const tau = s.t0 + k * s.S;
      const yd = yawDegAt(tau + sw);
      const sg = side === "L" ? -1 : 1;
      const last = k >= s.n - 1;
      // Small per-step variation (timing ±1 frame, length ±4 %, lift, bob, arms): never a perfect loop.
      const inner = k > 0 && k < s.n - 1;
      const j = inner ? Math.round(rnd(seed, tau * 1.7 + 0.3) * 1.2) : 0;
      const cx = last ? s.x1 : segX(s, tau + s.S) + 0.4 * step + (inner ? step * 0.04 * rnd(seed, tau * 2.3 + 0.9) : 0);
      const dur = sw + j;
      add(side, tau, dur, standPlant(sg, cx, yd, st[side]), true, L * LEGS.lift * (k === 0 || k === s.n ? 0.75 : 1) * (1 + 0.08 * rnd(seed, tau * 3.1)), k === 0 && !s.chainIn);
      lands.push({ t: tau + dur, S: s.S, amp: own.amp * (1 + 0.12 * rnd(seed, tau * 4.7 + 0.2)), arm: own.arm * (1 + 0.1 * rnd(seed, tau * 5.3 + 0.6)) });
      side = side === "L" ? "R" : "L";
    }
    nextSide = side;
  }
  lands.sort((a, b) => a.t - b.t);
  return { segs, L: feet.L, R: feet.R, lands };
};

/* ─────────────── Foot state ─────────────── */

export type FootState = {
  /** Ankle (world). */
  ankle: V3;
  /** + toe up, − heel up (deg). */
  pitch: number;
  /** Foot direction (deg, 0 = toward the camera, + toe to screen right). */
  yaw: number;
  /** 1 on the ground (supporting), 0 in the air. */
  contact: number;
  /** Where the foot is (or will be) planted. */
  plant: Plant;
  /** Lifted foot (swing). */
  swinging: boolean;
};

const ease = (u: number) => u * u * (3 - 2 * u);

/** How far a foot must rise so no part of its sole is under the ground. */
const clearance = (p: Proportions, ankle: V3, pitch: number, yaw: number) => {
  const f = footOf(p);
  let low = 0;
  for (const b of [-f.heel, 0, f.ball, f.toe]) low = Math.min(low, footPoint(p, ankle, pitch, yaw, 0, b, 0).u);
  return -low;
};

/** A foot's planned state at a frame (before the legs' reach adjustments). */
export const footAt = (p: Proportions, fp: FootPlan, t: number): FootState => {
  let i = -1;
  for (let k = 0; k < fp.swings.length; k++) if (fp.swings[k].t0 <= t) i = k;
  const next = fp.swings[i + 1];
  const sw = i >= 0 ? fp.swings[i] : undefined;
  if (sw && t < sw.t1) {
    const u = clamp01((t - sw.t0) / (sw.t1 - sw.t0));
    const e = ease(u);
    const p0 = sw.walk ? -LEGS.toeOff : 0;
    const p1 = sw.walk ? LEGS.heelStrike : 0;
    const a0 = ankleOf(p, sw.from, p0);
    const a1 = ankleOf(p, sw.to, p1);
    const lift = Math.sin(Math.PI * Math.min(1, u * 1.08)) * sw.lift;
    const pitch = sw.walk ? lerp(p0, p1, ease(clamp01(u * 1.1))) - 8 * Math.sin(Math.PI * u) : -6 * Math.sin(Math.PI * u);
    const ankle = { x: lerp(a0.x, a1.x, e), u: lerp(a0.u, a1.u, e) + lift, z: lerp(a0.z, a1.z, e) };
    const yaw = lerp(sw.from.yaw, sw.to.yaw, e);
    ankle.u += clearance(p, ankle, pitch, yaw);
    return {
      ankle,
      pitch,
      yaw,
      contact: smooth(u, 0.7, 0.3),
      plant: sw.to,
      swinging: true,
    };
  }
  const pl = sw ? sw.to : fp.start;
  let pitch = 0;
  // Walking stance: heel strike → foot flat; heel off → toe off before the next walking swing.
  if (sw?.walk) pitch += LEGS.heelStrike * (1 - smooth(t, sw.t1, 4));
  if (next?.walk) pitch -= LEGS.toeOff * smooth(t, next.t0 - (next.t1 - next.t0) * 0.45, (next.t1 - next.t0) * 0.45);
  return { ankle: ankleOf(p, pl, pitch), pitch, yaw: pl.yaw, contact: 1, plant: pl, swinging: false };
};

/** 0…1 support of each foot (1 = carries weight), eased around lift-off and landing. */
const supportOf = (fp: FootPlan, t: number) => {
  let s = 1;
  // The first step of a walk is anticipated: the weight moves onto the other foot well before it lifts.
  for (const sw of fp.swings) {
    const pre = sw.first ? 8 : 2;
    s = Math.min(s, 1 - (smooth(t, sw.t0 - pre, pre + 1) - smooth(t, sw.t1 - 2, 3)));
  }
  return s;
};

/* ─────────────── Legs IK ─────────────── */

export type LegSolve = {
  hip: { x: number; y: number };
  knee: { x: number; y: number };
  ankle: { x: number; y: number };
  /** World points (for depth order and tests). */
  hip3: V3;
  knee3: V3;
  ankle3: V3;
  foot: FootState;
  /** Knee flexion (deg, 0 = straight). */
  bend: number;
  /** Knee direction (unit, world): the way the knee points. */
  kneeDir: V3;
};

export type LowerBody = {
  /** Hip centre on screen (after the sink that keeps the feet down). */
  hip: { x: number; y: number };
  sink: number;
  /** Pelvis tilt (deg, the Bottom and hip joints), + clockwise. */
  pelvis: number;
  /** Walking shoulder counter-tilt (deg) to add to the torso. */
  counter: number;
  /** −1 (screen-left foot) … 1 (screen-right) weight. */
  weight: number;
  L: LegSolve;
  R: LegSolve;
  /** Walking amount 0…1 and its direction. */
  walk: number;
  dir: number;
  /** Arm swing (−1 back … 1 forward) per arm, for walking. */
  swingL: number;
  swingR: number;
  /** Body x walked so far (canvas px). */
  walked: number;
  /**
   * v7 (optional for hand-made LowerBody values): the arm swing again a few frames later (forearm,
   * hand: overlap), pelvis twist (−1 screen-left leg forward … 1 screen-right) now and a few frames
   * late (the skirt / ponytail follow it), the gait phase and the walk's blended direction.
   */
  lag?: { L: [number, number]; R: [number, number] };
  twist?: number;
  twistLag?: number;
  gait?: { phase: number; amp: number; arm: number; bounce: number; arms: number; mix: number };
};

const sub = (a: V3, b: V3): V3 => ({ x: a.x - b.x, u: a.u - b.u, z: a.z - b.z });
const add3 = (a: V3, b: V3, k = 1): V3 => ({ x: a.x + b.x * k, u: a.u + b.u * k, z: a.z + b.z * k });
const dot = (a: V3, b: V3) => a.x * b.x + a.u * b.u + a.z * b.z;
const len3 = (a: V3) => Math.sqrt(dot(a, a));

/** Two-bone IK: the knee goes toward `fwd` (never backward); returns the knee. */
export const solveLeg = (hip: V3, ankle: V3, l1: number, l2: number, fwd: V3) => {
  const v = sub(ankle, hip);
  const d = clamp(len3(v), Math.abs(l1 - l2) + 1, l1 + l2 - 0.01);
  const u = { x: v.x / (len3(v) || 1), u: v.u / (len3(v) || 1), z: v.z / (len3(v) || 1) };
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  let n = add3(fwd, u, -dot(fwd, u));
  const nl = len3(n);
  n = nl > 1e-6 ? { x: n.x / nl, u: n.u / nl, z: n.z / nl } : { x: 0, u: 0, z: 1 };
  const knee = add3(add3(hip, u, a), n, h);
  const bend = 180 - (Math.acos(clamp((l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2), -1, 1)) * 180) / Math.PI;
  return { knee, bend, dir: n };
};

/** Raise the heel (foot behind the hip) or the toe (foot ahead), then lift the foot, until the leg reaches it. */
const fitFoot = (p: Proportions, hip: V3, f: FootState, r: number, heelMax: number): FootState => {
  if (len3(sub(f.ankle, hip)) <= r) return f;
  const fwd = { x: Math.sin(rad(f.yaw)), u: 0, z: Math.cos(rad(f.yaw)) };
  // Only a foot clearly ahead of the hip rocks back on its heel; under or behind the hip, the heel rises.
  const ahead = dot(sub(f.ankle, hip), fwd) > footOf(p).len * 0.3;
  const sg = ahead ? 1 : -1;
  const base = f.pitch;
  const at = (k: number) => {
    const pitch = sg > 0 ? Math.max(base, k) : Math.min(base, -k);
    return f.swinging ? { ...f, pitch } : { ...f, pitch, ankle: ankleOf(p, f.plant, pitch) };
  };
  // A lifted foot keeps its own pitch; a planted one rocks on its heel / ball first.
  let out = f.swinging ? f : at(heelMax);
  if (!f.swinging && len3(sub(out.ankle, hip)) <= r) {
    let lo = 0;
    let hi = heelMax;
    for (let i = 0; i < 18; i++) {
      const m = (lo + hi) / 2;
      if (len3(sub(at(m).ankle, hip)) > r) lo = m;
      else hi = m;
    }
    return at(hi);
  }
  const v = sub(out.ankle, hip);
  const k = r / len3(v);
  out = { ...out, ankle: add3(hip, v, k), contact: 0 };
  out.ankle.u += clearance(p, out.ankle, out.pitch, out.yaw);
  return out;
};

/**
 * Lower body at a frame: hips over planted feet. `pose` is the evaluated body pose (pose.x already
 * includes the walk unless in place), `yawB` the body yaw, `dip` the anticipation dip.
 */
export const solveLower = (p: Proportions, plan: FeetPlan, pose: Pose, frame: number, yawB: number, dip: number, hipBaseY: number): LowerBody => {
  const L = legLength(p);
  const yd = yawB * LEGS.yawDeg;
  const ab = Math.abs(yawB);
  const ws = walkState(plan.segs, frame);
  const wk = { w: ws.w, dir: ws.dir as number, s: ws.seg, mix: ws.mix };
  const g = gaitAt(plan, frame);
  const walked = bodyXOf(plan.segs, frame);
  const inPlace = wk.s?.inPlace ?? plan.segs.filter((s) => frame >= s.t0).slice(-1)[0]?.inPlace ?? false;
  const shift = inPlace ? -walked : 0;
  const fL0 = footAt(p, plan.L, frame);
  const fR0 = footAt(p, plan.R, frame);
  const mv = (f: FootState): FootState => (shift ? { ...f, ankle: { ...f.ankle, x: f.ankle.x + shift }, plant: { ...f.plant, x: f.plant.x + shift } } : f);
  const toCanvas = (f: FootState): FootState => ({ ...f, ankle: { ...f.ankle, x: f.ankle.x + CANVAS.centerX }, plant: { ...f.plant, x: f.plant.x + CANVAS.centerX } });
  const fL = toCanvas(mv(fL0));
  const fR = toCanvas(mv(fR0));
  const hipX = CANVAS.centerX + pose.x;
  // Weight: walking → the supporting foot; standing → `weight` plus where the hips are over the feet.
  const sL = supportOf(plan.L, frame);
  const sR = supportOf(plan.R, frame);
  const support = (sR - sL) / Math.max(0.2, sL + sR);
  const mid = (fL.plant.x + fR.plant.x) / 2;
  const half = Math.max(12, Math.abs(fR.plant.x - fL.plant.x) / 2);
  const geo = clamp((hipX - mid) / half, -1, 1);
  const standW = clamp((pose.weight ?? 0) * 0.6 + geo * 0.5, -1, 1);
  const weight = lerp(standW, support * 0.7, wk.w);
  const pelvis = -weight * (4 - 1.5 * wk.w);
  // Standing contrapposto is in the pose (evaluatePose); walking adds the shoulders' counter to the stance leg.
  const counter = weight * wk.w;
  const rot = rad(pose.lean + pelvis);
  // Pelvis twist (walking): the hip of the leg that swings forward goes forward with it.
  const stepLen = wk.s ? Math.abs(wk.s.x1 - wk.s.x0) / wk.s.n : 100;
  const fwdOf = (ax: number, hx: number) => clamp(((ax - hx) * wk.mix) / Math.max(20, stepLen * 0.5), -1, 1);
  const twist = wk.w > 0 ? ((fwdOf(fR.ankle.x, hipX) - fwdOf(fL.ankle.x, hipX)) / 2) * wk.w : 0;
  const twistLag = (() => {
    if (wk.w <= 0) return 0;
    const hx = bodyXOf(plan.segs, frame - 3);
    return ((fwdOf(footAt(p, plan.R, frame - 3).ankle.x, hx) - fwdOf(footAt(p, plan.L, frame - 3).ankle.x, hx)) / 2) * wk.w;
  })();
  // Hip joints sit so a straight standing leg just reaches its planted ankle.
  const oy = hipJointDrop(p);
  const hipJoint = (side: 1 | -1, y: number): V3 => {
    const ox = side * p.legGap * (1 - 0.3 * ab) + yawB * 8 + side * Math.sign(wk.mix) * twist * p.legGap * 0.3;
    const x = hipX + ox * Math.cos(rot) - oy * Math.sin(rot);
    const yy = y + ox * Math.sin(rot) + oy * Math.cos(rot);
    // Both hip joints at the same height in the world (the pelvis line recedes in depth with the turn).
    return { x, u: groundScreen(p) - yy, z: -side * p.legGap * Math.sin(rad(yd)) };
  };
  const r = L * LEGS.reach;
  let y = hipBaseY;
  // Sink: as far as needed (within limits) for the supporting feet to stay down.
  const maxSink = L * lerp(LEGS.sink, LEGS.sinkWalk, wk.w);
  let need = 0;
  for (const [side, f] of [[-1, fL], [1, fR]] as const) {
    const h = hipJoint(side, y);
    // A free (unweighted) standing leg does not hold the hips down: its heel rises instead.
    const free = Math.max(0, -side * weight) * (1 - wk.w);
    const w = (f.swinging ? f.contact : 1) * (1 - free);
    const target = f.swinging ? ankleOf(p, { ...f.plant, x: f.plant.x }, LEGS.heelStrike) : f.ankle;
    const dx = target.x - h.x;
    const dz = target.z - h.z;
    const hz2 = dx * dx + dz * dz;
    const top = target.u + Math.sqrt(Math.max(0, r * r - hz2));
    need = Math.max(need, w * Math.max(0, h.u - top));
  }
  // Walking (v7): soft knees and the hip arc — down just after each heel strike, up as the free leg
  // passes (Williams' contact → down → passing → up). The feet still win: never less than `need`.
  const bounce = wk.s?.bounce ?? 1;
  const arc = L * (LEGS.gaitFlex + LEGS.gaitBob * bounce * g.amp * Math.cos(2 * Math.PI * (g.phase - 0.15))) * wk.w;
  // Stopping: the knees take the last step and the hips settle back up.
  let settle = 0;
  for (const s of plan.segs) {
    if (s.chainOut) continue;
    const u = (frame - s.end + 2) / 16;
    if (u > 0 && u < 1) settle = Math.max(settle, Math.sin(Math.PI * u) * (1 - u) * 1.5);
  }
  // Contrapposto: the hips ride up on the straight weight-bearing leg (the free knee bends, its heel lifts).
  let up = 0;
  if (need <= 0 && Math.abs(weight) > 0.02 && wk.w < 1) {
    const side = weight > 0 ? 1 : -1;
    const f = side > 0 ? fR : fL;
    const h = hipJoint(side, y);
    const rest = L * 0.997;
    const dx = f.ankle.x - h.x;
    const dz = f.ankle.z - h.z;
    const top = f.ankle.u + Math.sqrt(Math.max(0, rest * rest - dx * dx - dz * dz));
    up = clamp(top - h.u, 0, L * 0.03) * Math.min(1, Math.abs(weight) * 2) * (1 - wk.w);
  }
  const sink = Math.min(maxSink, Math.max(need, arc)) - up + settle * L * 0.012;
  y += sink;
  const heelMax = lerp(LEGS.heelMax, LEGS.toeOff + 6, wk.w);
  const leg = (side: 1 | -1, f0: FootState): LegSolve => {
    const h = hipJoint(side, y);
    const f = fitFoot(p, h, f0, r, heelMax);
    const fwd = { x: Math.sin(rad(f.yaw)), u: 0, z: Math.cos(rad(f.yaw)) };
    const s = solveLeg(h, f.ankle, p.thigh, p.shin, fwd);
    return { hip: toScreen(p, h), knee: toScreen(p, s.knee), ankle: toScreen(p, f.ankle), hip3: h, knee3: s.knee, ankle3: f.ankle, foot: f, bend: s.bend, kneeDir: s.dir };
  };
  // Arms swing against the legs, two frames behind them (follow-through); forearm / hand later still.
  const swingOf = (fp: FootPlan, lag = 2) => {
    if (wk.w <= 0 || !wk.s) return 0;
    const f = footAt(p, fp, frame - lag);
    const step = Math.abs(wk.s.x1 - wk.s.x0) / wk.s.n;
    const hx = bodyXOf(plan.segs, frame - lag);
    return clamp(((f.ankle.x - hx) * wk.dir) / Math.max(20, step * 0.6), -1, 1) * wk.w;
  };
  return {
    hip: { x: hipX, y },
    sink,
    pelvis,
    counter,
    weight,
    L: leg(-1, fL),
    R: leg(1, fR),
    walk: wk.w,
    dir: wk.dir,
    swingL: swingOf(plan.R),
    swingR: swingOf(plan.L),
    walked,
    lag: { L: [swingOf(plan.R, 4), swingOf(plan.R, 6)], R: [swingOf(plan.L, 4), swingOf(plan.L, 6)] },
    twist,
    twistLag,
    gait: { ...g, bounce, arms: wk.s?.arms ?? 1, mix: wk.mix },
  };
};
