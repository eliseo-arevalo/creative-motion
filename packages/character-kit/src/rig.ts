import { clamp, deg, rad, wrap } from "./math";
import { handRoll } from "./roll";
import type { ArmPose, CharacterSpec, Pose, Proportions, Reach, ReachAnchor } from "./types";

/** Canvas every character is drawn on (feet on GROUND, centred on x = 400). */
export const CANVAS = { width: 800, height: 1500, ground: 1440, centerX: 400 } as const;
export const FOOT_HEIGHT = 26;

export const hipY = (p: Proportions) => CANVAS.ground - FOOT_HEIGHT - p.thigh - p.shin;
/** Head centre above the top of the neck. */
export const headCenterY = (p: Proportions) => p.headRy * 0.9;

/** Joint positions in torso space (hip joint at 0,0, y down). */
export const joints = (p: Proportions) => {
  const neckBase = { x: 0, y: -p.torso };
  const headC = { x: 0, y: -p.torso - p.neck - headCenterY(p) };
  return {
    neckBase,
    headC,
    shoulder: (side: 1 | -1) => ({ x: side * p.shoulderHalf, y: -p.torso + p.shoulderDrop }),
    waistY: -p.torso * 0.36,
  };
};

/** The bits of the body pose the arm targets depend on (head anchors follow the head). */
export type BodyFrame = { neck: number; head: number; shrug: number };
const NO_BODY: BodyFrame = { neck: 0, head: 0, shrug: 0 };

export const HEAD_ANCHORS: ReadonlySet<ReachAnchor> = new Set<ReachAnchor>(["chin", "cheek", "ear", "headTop"]);

const rot = (x: number, y: number, d: number) => {
  const c = Math.cos(rad(d));
  const s = Math.sin(rad(d));
  return { x: x * c - y * s, y: x * s + y * c };
};

/** Head-local point (centre at 0,0, unrotated) → torso space, through the neck and head rotations. */
export const headToTorso = (p: Proportions, b: BodyFrame, x: number, y: number) => {
  const h = rot(x, y - headCenterY(p), b.head);
  const n = rot(h.x, h.y - p.neck, b.neck);
  return { x: n.x, y: n.y - p.torso - b.shrug * 0.3 };
};

/** Head centre, radii and rotation in torso space (for contact and collision). */
export const headOval = (p: Proportions, b: BodyFrame) => ({ c: headToTorso(p, b, 0, 0), rx: p.headRx, ry: p.headRy, rot: b.neck + b.head });

/** Shoulder pivot in torso space. */
export const shoulderAt = (p: Proportions, side: 1 | -1, shrug = 0) => ({ x: side * p.shoulderHalf, y: -p.torso + p.shoulderDrop - shrug });

/** Where a Reach anchor sits, in torso space. Head anchors ride on the head (neck + head tilt). */
export const anchorPoint = (p: Proportions, side: 1 | -1, r: Reach, b: BodyFrame = NO_BODY) => {
  const ox = side * (r.dx ?? 0) * p.hand;
  const oy = (r.dy ?? 0) * p.hand;
  const head = (x: number, y: number) => headToTorso(p, b, x + ox, y + oy);
  switch (r.anchor) {
    case "chin":
      return head(0, p.headRy * 0.98);
    case "cheek":
      return head(side * p.headRx * 0.55, p.headRy * 0.45);
    case "ear":
      return head(side * p.headRx, 6);
    case "headTop":
      return head(side * p.headRx * 0.55, -p.headRy * 0.78);
  }
  const base = (() => {
    switch (r.anchor) {
      case "chest":
        return { x: side * p.shoulderHalf * 0.15, y: -p.torso + p.torso * 0.36 };
      case "pocket":
        return { x: side * p.waistHalf * 0.35, y: 26 };
      case "hip":
        return { x: side * (p.hipHalf + 12), y: 6 };
      case "torso":
        return { x: 0, y: 0 };
      case "front":
      default:
        return { x: side * (p.shoulderHalf + p.upperArm * 0.55), y: -p.torso + p.shoulderDrop + p.upperArm * 0.8 };
    }
  })();
  return { x: base.x + ox, y: base.y + oy };
};

/* ─────────────── Arm IK with joint limits ─────────────── */

/**
 * Joint limits (deg, shoulder space, 0 = down, + outward). The elbow only folds one way: it stays on
 * the pole side of the shoulder→wrist line (at most `hyper` degrees past straight).
 */
export const ARM_LIMITS = { shoulder: [-80, 190] as const, elbowFlex: 152, hyper: 8, wrist: [-95, 95] as const };

/**
 * 2D elbow fold limit for an upper arm drawn at `upper` of its length. Foreshortened (elbow toward
 * the camera, e.g. a hand on the cheek with the elbow down at the side) the projected fold looks
 * sharper than the real one, so it may close further (up to 170°).
 */
export const elbowFlexOf = (upper = 1) => (upper >= 1 ? ARM_LIMITS.elbowFlex : Math.min(170, ARM_LIMITS.elbowFlex + 60 * (1 - upper)));

/** Default elbow direction for a wrist at (u outward, v down) from the shoulder. */
export const defaultPole = (u: number, v: number): [number, number] => {
  const up = clamp(-v / Math.max(1, Math.hypot(u, v)), 0, 1);
  const x = 0.35 + 1.1 * up;
  const n = Math.hypot(x, 1);
  return [x / n, 1 / n];
};

/** Elbow and wrist positions in shoulder space (u outward, v down) for a pair of angles. */
export const armPoints = (l1: number, l2: number, shoulder: number, elbow: number) => {
  const a1 = rad(shoulder);
  const a2 = rad(shoulder + elbow);
  const e = { u: Math.sin(a1) * l1, v: Math.cos(a1) * l1 };
  return { elbow: e, wrist: { u: e.u + Math.sin(a2) * l2, v: e.v + Math.cos(a2) * l2 } };
};

/**
 * Which side of the shoulder→wrist line the elbow sits on, relative to the pole:
 * > 0 pole side (natural), < 0 inverted, ~0 straight arm or pole along the line (no preference).
 */
export const elbowSide = (l1: number, l2: number, shoulder: number, elbow: number, pole: [number, number]) => {
  const { elbow: e, wrist: w } = armPoints(l1, l2, shoulder, elbow);
  const L = Math.hypot(w.u, w.v) || 1;
  const n = { u: -w.v / L, v: w.u / L };
  const pn = pole[0] * n.u + pole[1] * n.v;
  if (Math.abs(pn) < 0.2) return 0;
  return Math.sign(pn) * (e.u * n.u + e.v * n.v);
};

/** Two-bone IK in shoulder space: the elbow goes to the pole side, the arm never stretches. */
export const solveArmLocal = (l1: number, l2: number, u: number, v: number, pole?: [number, number], bendSign?: number, flex: number = ARM_LIMITS.elbowFlex) => {
  const pl = pole ?? defaultPole(u, v);
  // Closest the wrist can get at full elbow flex, so a too-close target never needs a fold past the limit.
  const dMin = Math.sqrt(l1 * l1 + l2 * l2 - 2 * l1 * l2 * Math.cos(rad(180 - flex))) + 0.5;
  // Partway through a fold change the forearm points at the camera, so the wrist can come closer.
  const partial = bendSign !== undefined && Math.abs(bendSign) < 0.999;
  const d = clamp(Math.hypot(u, v), partial ? Math.max(0.5, dMin * Math.abs(bendSign!)) : dMin, l1 + l2 - 0.5);
  const phi = Math.atan2(u, v);
  const alpha = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  const tu = Math.sin(phi) * d;
  const tv = Math.cos(phi) * d;
  const pick = [phi + alpha, phi - alpha]
    .map((a1) => {
      const e = { u: Math.sin(a1) * l1, v: Math.cos(a1) * l1 };
      return { a1, e, score: e.u * pl[0] + e.v * pl[1] };
    })
    .sort((a, b) => b.score - a.score)[0];
  let k1 = 1;
  let k2 = 1;
  if (bendSign !== undefined && bendSign !== 0) {
    // Forced fold direction: upper arm past the target line ⇒ elbow folds back (negative). If that
    // needs a shoulder angle outside the joint range, the other fold is the only real option.
    const inRange = (a: number) => Math.abs(limitShoulder(wrap(deg(a))) - wrap(deg(a))) < 0.5;
    let a1 = bendSign < 0 ? phi + alpha : phi - alpha;
    const other = bendSign < 0 ? phi - alpha : phi + alpha;
    if (Math.abs(bendSign) >= 0.999 && !inRange(a1) && inRange(other)) a1 = other;
    pick.a1 = a1;
    pick.e = { u: Math.sin(a1) * l1, v: Math.cos(a1) * l1 };
  }
  if (bendSign !== undefined && Math.abs(bendSign) < 0.999) {
    // Partway through a fold-direction change: the elbow comes toward the camera, so it slides onto
    // the shoulder→wrist line and both bones shorten (foreshortening) — continuous, never a flip.
    const wu = tu / d;
    const wv = tv / d;
    const along = pick.e.u * wu + pick.e.v * wv;
    const h0 = pick.e.u * -wv + pick.e.v * wu;
    // Slide the elbow toward the line by |bendSign|. The elbow then points toward the camera, so the
    // 2D shoulder angle is not a real joint angle here and is not clamped (keeps the wrist on target).
    // On the line the elbow sits between shoulder and wrist (bones in proportion), never behind it.
    const f = Math.abs(bendSign);
    const al = (d * l1) / (l1 + l2) + (along - (d * l1) / (l1 + l2)) * f;
    const eu = wu * al - wv * h0 * f;
    const ev = wv * al + wu * h0 * f;
    const L1 = Math.max(1, Math.hypot(eu, ev));
    const L2 = Math.max(1, Math.hypot(tu - eu, tv - ev));
    k1 = L1 / l1;
    k2 = L2 / l2;
    pick.a1 = Math.atan2(eu, ev);
    pick.e = { u: eu, v: ev };
  }
  const a2 = Math.atan2(tu - pick.e.u, tv - pick.e.v);
  const fs = bendSign !== undefined && Math.abs(bendSign) < 0.999;
  return { shoulder: fs ? wrap(deg(pick.a1)) : limitShoulder(wrap(deg(pick.a1))), elbow: wrap(deg(a2) - deg(pick.a1)), k1, k2 };
};

/** Shoulder angle into ARM_LIMITS.shoulder, clamping (around the circle) to the nearest bound. */
export const limitShoulder = (a: number) => {
  const [lo, hi] = ARM_LIMITS.shoulder;
  let x = wrap(a);
  if (x < lo && x + 360 <= hi) x += 360;
  if (x >= lo && x <= hi) return x;
  const dHi = ((x - hi) % 360 + 360) % 360;
  const dLo = ((lo - x) % 360 + 360) % 360;
  return dHi < dLo ? hi : lo;
};

/** Two-bone IK for one arm toward a torso-space target (kept for callers of stage 1). */
export const solveArm = (p: Proportions, side: 1 | -1, target: { x: number; y: number }, _bend: 1 | -1 = 1, upper = 1, pole?: [number, number], shrug = 0) => {
  const s = shoulderAt(p, side, shrug);
  return solveArmLocal(p.upperArm * upper, p.foreArm, side * (target.x - s.x), target.y - s.y, pole, undefined, elbowFlexOf(upper));
};

/** Clamp an arm to the joint limits (shoulder range, one-way elbow, wrist range). */
export const limitArm = (p: Proportions, a: ArmPose): ArmPose => {
  const l1 = p.upperArm * (a.upper ?? 1);
  const l2 = p.foreArm * (a.fore ?? 1);
  // Foreshortened (elbow toward the camera): the 2D shoulder angle is free.
  const fs = a.bendSign !== undefined && Math.abs(a.bendSign) < 0.999;
  const shoulder = fs ? wrap(a.shoulder) : limitShoulder(a.shoulder);
  const flex = elbowFlexOf(a.upper);
  let elbow = clamp(wrap(a.elbow), -flex, flex);
  const { wrist: w } = armPoints(l1, l2, shoulder, elbow);
  const pole = a.pole ?? defaultPole(w.u, w.v);
  if (a.bendSign !== undefined) {
    // Fold direction comes from the solver (it may pass through 0, foreshortened); only clamp a clear reversal.
    const sg = Math.sign(a.bendSign);
    if (Math.abs(a.bendSign) > 0.5 && Math.sign(elbow) === -sg && Math.abs(elbow) > ARM_LIMITS.hyper) elbow = -sg * ARM_LIMITS.hyper;
  } else if (elbowSide(l1, l2, shoulder, elbow, pole) < 0 && Math.abs(elbow) > ARM_LIMITS.hyper) elbow = Math.sign(elbow) * ARM_LIMITS.hyper;
  const wrist = clamp(wrap(a.wrist), ARM_LIMITS.wrist[0], ARM_LIMITS.wrist[1]);
  return { ...a, shoulder, elbow, wrist };
};

/** Resolve an arm's `reach` (if any) into plain angles for this rig. */
export const resolveArm = (p: Proportions, side: 1 | -1, arm: ArmPose, b: BodyFrame = NO_BODY): ArmPose => {
  let out = arm;
  if (arm.reach) {
    const a = solveArm(p, side, anchorPoint(p, side, arm.reach, b), 1, arm.upper ?? 1, arm.pole, b.shrug);
    out = { ...out, shoulder: a.shoulder, elbow: a.elbow, reach: undefined };
  }
  if (out.handDir !== undefined) out = { ...out, wrist: wrap(out.handDir - out.shoulder - out.elbow), handDir: undefined };
  return out;
};

export const resolvePose = (p: Proportions, pose: Pose): Pose => ({
  ...pose,
  armL: resolveArm(p, -1, pose.armL, pose),
  armR: resolveArm(p, 1, pose.armR, pose),
});

/* ─────────────── Forward kinematics (canvas coordinates), for attaching props ─────────────── */

type M = [number, number, number, number, number, number];
const mul = (a: M, b: M): M => [
  a[0] * b[0] + a[2] * b[1],
  a[1] * b[0] + a[3] * b[1],
  a[0] * b[2] + a[2] * b[3],
  a[1] * b[2] + a[3] * b[3],
  a[0] * b[4] + a[2] * b[5] + a[4],
  a[1] * b[4] + a[3] * b[5] + a[5],
];
const T = (x: number, y: number): M => [1, 0, 0, 1, x, y];
const R = (d: number): M => {
  const c = Math.cos(rad(d));
  const s = Math.sin(rad(d));
  return [c, s, -s, c, 0, 0];
};
const S = (x: number, y: number): M => [x, 0, 0, y, 0, 0];
const apply = (m: M, x: number, y: number) => ({ x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] });

/** Canvas positions of the wrists, grip points and head centre for a (resolved) pose. */
export const forward = (spec: CharacterSpec, pose: Pose) => {
  const p = spec.proportions;
  const root = mul(T(CANVAS.centerX + pose.x, hipY(p) + pose.y), R(pose.lean));
  const torso = mul(root, R(pose.torso));
  const arm = (side: 1 | -1, a: ArmPose) => {
    const sh = joints(p).shoulder(side);
    let m = mul(torso, T(sh.x, sh.y - pose.shrug));
    if (side < 0) m = mul(m, S(-1, 1));
    m = mul(m, R(-a.shoulder));
    m = mul(m, T(0, p.upperArm * (a.upper ?? 1)));
    const elbow = apply(m, 0, 0);
    m = mul(m, R(-a.elbow));
    m = mul(m, T(0, p.foreArm * (a.fore ?? 1)));
    const wrist = apply(m, 0, 0);
    m = mul(m, R(-a.wrist));
    const grip = apply(m, 0, p.hand * 0.52);
    const worldAngle = -(side * (a.shoulder + a.elbow + a.wrist)) + pose.lean + pose.torso;
    const k = p.hand / 82;
    const sx = handRoll(a.hand, a.handFrom, a.handMix, a.roll, a.mirror).sx;
    const hm = m;
    /** Canvas position of a point in hand-model space (82-px hand, as in HAND_MODELS), roll applied. */
    const point = (x: number, y: number) => apply(hm, x * k * sx, y * k);
    return { elbow, wrist, grip, worldAngle, point };
  };
  const head = mul(mul(mul(mul(torso, T(0, -p.torso - pose.shrug * 0.3)), R(pose.neck)), T(0, -p.neck)), R(pose.head));
  return { armL: arm(-1, pose.armL), armR: arm(1, pose.armR), head: apply(head, 0, -headCenterY(p)) };
};
