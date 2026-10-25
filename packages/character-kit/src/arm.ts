import { clamp01, lerp, rad, wrap } from "./math";
import { HEAD_ANCHORS, anchorPoint, armPoints, defaultPole, headOval, shoulderAt, solveArmLocal, type BodyFrame } from "./rig";
import type { ArmPose, HandShape, Proportions } from "./types";

/**
 * Arm motion in effector space. Each key pose becomes a wrist target + hand direction; moves
 * between keys follow a curved path (never a straight line through the head or a swing out
 * and back), contact poses approach the face from below / outside, and every frame is solved
 * with pole-aware IK and joint limits. Head anchors are re-evaluated every frame, so a hand
 * on the cheek or a phone at the ear stays glued while the head moves.
 */
export type Effector = {
  /** Wrist, torso space. */
  x: number;
  y: number;
  /** Hand direction in shoulder space (0 = down, + outward), in (-120, 240]. */
  dir: number;
  upper: number;
  pole?: [number, number];
  /** Hand is meant to touch the head (cheek, chin, ear, top). */
  contact: boolean;
  /** Elbow fold direction (sign of the elbow angle), -1…1; crosses 0 when a move changes it. */
  bend?: number;
  hand: HandShape;
  handFrom?: HandShape;
  handMix?: number;
};

const normDir = (d: number) => {
  let x = wrap(d);
  if (x <= -120) x += 360;
  return x;
};

const toSide = (p: Proportions, side: 1 | -1, shrug: number, x: number, y: number) => {
  const s = shoulderAt(p, side, shrug);
  return { u: side * (x - s.x), v: y - s.y };
};
const fromSide = (p: Proportions, side: 1 | -1, shrug: number, u: number, v: number) => {
  const s = shoulderAt(p, side, shrug);
  return { x: s.x + side * u, y: s.y + v };
};

const bendOf = (elbow: number): 1 | -1 | undefined => (Math.abs(elbow) < 3 ? undefined : elbow > 0 ? 1 : -1);

/** A key's arm as an effector, against the current body (so head anchors follow the head). */
export const effectorOf = (p: Proportions, side: 1 | -1, a: ArmPose, b: BodyFrame): Effector => {
  const upper = a.upper ?? 1;
  const l1 = p.upperArm * upper;
  const base = { upper, pole: a.pole, hand: a.hand, handFrom: a.handFrom, handMix: a.handMix };
  if (a.reach) {
    const t = anchorPoint(p, side, a.reach, b);
    const loc = toSide(p, side, b.shrug, t.x, t.y);
    const ik = solveArmLocal(l1, p.foreArm, loc.u, loc.v, a.pole);
    return { ...base, x: t.x, y: t.y, dir: normDir(a.handDir ?? ik.shoulder + ik.elbow + a.wrist), contact: HEAD_ANCHORS.has(a.reach.anchor), bend: bendOf(ik.elbow) };
  }
  const w = armPoints(l1, p.foreArm, a.shoulder, a.elbow).wrist;
  const t = fromSide(p, side, b.shrug, w.u, w.v);
  return { ...base, x: t.x, y: t.y, dir: normDir(a.handDir ?? a.shoulder + a.elbow + a.wrist), contact: false, bend: bendOf(a.elbow) };
};

/** Quadratic Bézier, extended along the end tangents for t < 0 (anticipation) and t > 1 (overshoot). */
const bez = (a: number, c: number, b: number, t: number) => {
  if (t < 0) return a + t * 2 * (c - a);
  if (t > 1) return b + (t - 1) * 2 * (b - c);
  return (1 - t) * (1 - t) * a + 2 * (1 - t) * t * c + t * t * b;
};

/** Push a torso-space point out of the head oval (grown by `m`); returns the shift. */
const outOfHead = (p: Proportions, b: BodyFrame, x: number, y: number, m: number) => {
  const o = headOval(p, b);
  const r = rad(-o.rot);
  const dx = x - o.c.x;
  const dy = y - o.c.y;
  const qx = dx * Math.cos(r) - dy * Math.sin(r);
  const qy = dx * Math.sin(r) + dy * Math.cos(r);
  const k = (qx / (o.rx + m)) ** 2 + (qy / (o.ry + m)) ** 2;
  if (k >= 1) return { x: 0, y: 0 };
  const f = 1 / Math.sqrt(Math.max(k, 1e-4)) - 1;
  return { x: dx * f, y: dy * f };
};

/** Hand-centre offset from the wrist (torso space) for a hand direction. */
const handVec = (p: Proportions, side: 1 | -1, dir: number, k = 0.45) => ({ x: side * Math.sin(rad(dir)) * p.hand * k, y: Math.cos(rad(dir)) * p.hand * k });

const smooth01 = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};

/**
 * How far the hand may enter the head oval (1 = freely) at wrist P: only within reach of the
 * contact it is landing on / leaving (distance based, so the hand eases in instead of popping).
 */
const contactAllowance = (p: Proportions, a: Effector, b: Effector, P: { x: number; y: number }) => {
  const near = (e: Effector) => (e.contact ? 1 - smooth01((Math.hypot(P.x - e.x, P.y - e.y) / p.hand - 0.35) / 0.95) : 0);
  return Math.max(near(a), near(b));
};

/** Move from effector a toward b at blend t (may be < 0 or > 1 from the spring). */
export const blendEffector = (p: Proportions, side: 1 | -1, b0: BodyFrame, a: Effector, b: Effector, t: number): Effector => {
  const A = toSide(p, side, b0.shrug, a.x, a.y);
  const B = toSide(p, side, b0.shrug, b.x, b.y);
  const head = headOval(p, b0);
  const H = toSide(p, side, b0.shrug, head.c.x, head.c.y);
  const du = B.u - A.u;
  const dv = B.v - A.v;
  const L = Math.hypot(du, dv);
  let C: { u: number; v: number };
  // Into / out of a head contact: come up from below and outside the face, not across it.
  const approach = (P: { u: number; v: number }) => {
    const ru = P.u - H.u;
    const rv = P.v - H.v;
    const rl = Math.hypot(ru, rv) || 1;
    const au = ru / rl + 0.4;
    const av = rv / rl + 0.8;
    const al = Math.hypot(au, av) || 1;
    const k = Math.max(p.hand * 1.2, L * 0.55);
    return { u: P.u + (au / al) * k, v: P.v + (av / al) * k };
  };
  if (a.contact && b.contact) {
    // Face to face (chin → top of the head…): arc around the outside of the head, not across it.
    const mu = (A.u + B.u) / 2;
    const mv = (A.v + B.v) / 2;
    const ou = mu - H.u;
    const ov = mv - H.v;
    const ol = Math.hypot(ou, ov) || 1;
    C = { u: mu + (ou / ol) * Math.max(L * 0.25, p.hand * 0.6), v: mv + (ov / ol) * Math.max(L * 0.25, p.hand * 0.6) };
  } else if (b.contact && !a.contact) C = approach(B);
  else if (a.contact && !b.contact) C = approach(A);
  else {
    // Otherwise an arc that bulges toward the elbow side (down / outward), like a swinging forearm.
    const pole = defaultPole((A.u + B.u) / 2, (A.v + B.v) / 2);
    let nu = L > 0 ? -dv / L : 0;
    let nv = L > 0 ? du / L : 0;
    if (nu * pole[0] + nv * pole[1] < 0) {
      nu = -nu;
      nv = -nv;
    }
    C = { u: (A.u + B.u) / 2 + nu * L * 0.22, v: (A.v + B.v) / 2 + nv * L * 0.22 };
  }
  // Keep the path clear of the shoulder (a wrist passing over it means a fully folded arm whose
  // elbow flips sides) and of the face: try bowing the path the elbow's way, or to either side of
  // the chord, and keep the one that needs the least bend and never crosses the head.
  {
    const l1 = (p.upperArm * (a.upper + b.upper)) / 2;
    const reach = l1 + p.foreArm;
    const rMin0 = Math.min(Math.hypot(A.u, A.v), Math.hypot(B.u, B.v), reach * 0.55);
    const nu = L > 1 ? -dv / L : 0;
    const nv = L > 1 ? du / L : 0;
    const cands: [number, number][] = [b.pole ?? a.pole ?? [0.3, 1], [nu, nv], [-nu, -nv]];
    const minD = (c: { u: number; v: number }) => {
      let m = Infinity;
      for (let k = 1; k < 12; k++) m = Math.min(m, Math.hypot(bez(A.u, c.u, B.u, k / 12), bez(A.v, c.v, B.v, k / 12)));
      return m;
    };
    const headHits = (c: { u: number; v: number }) => {
      let n = 0;
      for (let k = 1; k < 10; k++) {
        const s = k / 10;
        const W = fromSide(p, side, b0.shrug, bez(A.u, c.u, B.u, s), bez(A.v, c.v, B.v, s));
        if ((a.contact && Math.hypot(W.x - a.x, W.y - a.y) < p.hand * 1.4) || (b.contact && Math.hypot(W.x - b.x, W.y - b.y) < p.hand * 1.4)) continue;
        const hv = handVec(p, side, lerp(a.dir, b.dir, s), 0.5);
        const o = outOfHead(p, b0, W.x + hv.x, W.y + hv.y, p.hand * 0.15);
        if (o.x !== 0 || o.y !== 0) n++;
      }
      return n;
    };
    let best = { c: C, cost: Infinity };
    // Opposite folds at the two ends (e.g. phone in front of the chest → at the ear): the elbow
    // comes forward through the camera, so the hand may pass close to the shoulder — no detour.
    const flip = a.bend !== undefined && b.bend !== undefined && Math.sign(a.bend) !== Math.sign(b.bend);
    const fold = Math.sqrt(l1 * l1 + p.foreArm * p.foreArm - 2 * l1 * p.foreArm * Math.cos((28 * Math.PI) / 180));
    const rMin = flip ? Math.min(rMin0, fold * 1.15) : rMin0;
    cands.forEach((pl, ci) => {
      if (L <= 1 && ci > 0) return;
      const pn = Math.hypot(pl[0], pl[1]) || 1;
      let c = C;
      let it = 0;
      for (; it < 8 && minD(c) < rMin; it++) c = { u: c.u + (pl[0] / pn) * reach * 0.12, v: c.v + (pl[1] / pn) * reach * 0.12 };
      const cost = headHits(c) * 10 + it + (minD(c) < rMin ? 40 : 0) + ci * 0.5;
      if (cost < best.cost) best = { c, cost };
    });
    C = best.c;
  }
  // Overshoot / anticipation run along the end tangents, at most a fraction of the chord; a hand
  // landing on the face never overshoots into it.
  const tp = b.contact ? Math.min(t, 1) : a.contact ? Math.max(t, 0) : t;
  const ext = (P0: { u: number; v: number }, Q: { u: number; v: number }, s: number) => {
    const eu = P0.u - Q.u;
    const ev = P0.v - Q.v;
    const el = Math.hypot(eu, ev) || 1;
    const k = 2 * Math.min(el, L * 0.6);
    return { u: P0.u + (eu / el) * k * s, v: P0.v + (ev / el) * k * s };
  };
  const Q = tp > 1 ? ext(B, C, tp - 1) : tp < 0 ? ext(A, C, -tp) : { u: bez(A.u, C.u, B.u, tp), v: bez(A.v, C.v, B.v, tp) };
  const u = Q.u;
  const v = Q.v;
  // Elbow fold: one direction for the move; if the two keys fold opposite ways, change it around
  // the point where the arm is most extended, through the foreshortened "elbow to camera" pose.
  let bend = a.bend ?? b.bend;
  if (a.bend !== undefined && b.bend !== undefined) {
    let w = clamp01(t);
    if (Math.sign(a.bend) !== Math.sign(b.bend)) {
      let best = 0;
      let tSwitch = 0.5;
      for (let k = 0; k <= 16; k++) {
        const s = k / 16;
        const d = Math.hypot(bez(A.u, C.u, B.u, s), bez(A.v, C.v, B.v, s));
        if (d > best + 0.5) {
          best = d;
          tSwitch = s;
        }
      }
      tSwitch = Math.min(0.75, Math.max(0.25, tSwitch));
      w = t < tSwitch ? 0 : 1;
    }
    bend = lerp(a.bend, b.bend, w);
  }
  let P = fromSide(p, side, b0.shrug, u, v);
  // Near the face: turn the palm to the face before landing; leave first, then turn (fingers never sweep the face).
  const inside = t >= 0 && t <= 1;
  const td = inside && b.contact && !a.contact ? 1 - (1 - t) * (1 - t) : inside && a.contact && !b.contact ? t * t : t;
  const dir = lerp(a.dir, b.dir, td);
  // Keep the hand out of the head unless this is the intended contact.
  const allow = contactAllowance(p, a, b, P);
  if (allow < 1) {
    const pushes = [0.45, 0.85].map((k) => {
      const hv = handVec(p, side, dir, k);
      return outOfHead(p, b0, P.x + hv.x, P.y + hv.y, p.hand * 0.3);
    });
    const push = pushes.reduce((m, q) => (Math.hypot(q.x, q.y) > Math.hypot(m.x, m.y) ? q : m));
    P = { x: P.x + push.x * (1 - allow), y: P.y + push.y * (1 - allow) };
  }
  const tc = clamp01(t);
  const pole = a.pole || b.pole ? (() => {
    const loc = toSide(p, side, b0.shrug, P.x, P.y);
    const dp = defaultPole(loc.u, loc.v);
    const pa = a.pole ?? dp;
    const pb = b.pole ?? dp;
    const x = lerp(pa[0], pb[0], tc);
    const y = lerp(pa[1], pb[1], tc);
    const n = Math.hypot(x, y) || 1;
    return [x / n, y / n] as [number, number];
  })() : undefined;
  const sameHand = a.hand === b.hand;
  return {
    x: P.x,
    y: P.y,
    dir,
    upper: lerp(a.upper, b.upper, t),
    pole,
    bend,
    contact: t > 0.5 ? b.contact : a.contact,
    hand: b.hand,
    ...(sameHand ? { handFrom: b.handFrom, handMix: b.handMix } : { handFrom: a.handFrom && (a.handMix ?? 1) < 0.5 ? a.handFrom : a.hand, handMix: clamp01(t * 1.15 - 0.05) }),
  };
};

/** Solve an effector into arm angles (pole-side elbow, no stretch). */
export const solveEffector = (p: Proportions, side: 1 | -1, b: BodyFrame, e: Effector): ArmPose => {
  const l1 = p.upperArm * e.upper;
  const loc = toSide(p, side, b.shrug, e.x, e.y);
  // Full-length solve on the current fold side; evaluatePose eases fold changes over a few frames.
  const ik = solveArmLocal(l1, p.foreArm, loc.u, loc.v, e.pole, e.bend === undefined ? undefined : e.bend >= 0 ? 1 : -1);
  return {
    bendSign: e.bend === undefined ? undefined : Math.abs(ik.elbow) < 0.5 ? (e.bend >= 0 ? 1 : -1) : ik.elbow > 0 ? 1 : -1,
    shoulder: ik.shoulder,
    elbow: ik.elbow,
    wrist: wrap(e.dir - ik.shoulder - ik.elbow),
    upper: e.upper,
    pole: e.pole,
    hand: e.hand,
    handFrom: e.handFrom,
    handMix: e.handMix,
  };
};

const sstep = (x: number, a: number, b: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/**
 * How much an arm is drawn in front of the torso / face (1) vs behind (0) for a body turn `yawB`.
 * Continuous in the pose, so the arm crossfades between layers instead of popping: only the
 * far arm in a clear 3/4 turn, hanging close to the body, goes behind; a raised hand (face,
 * phone, chest) always stays in front.
 */
export const armFrontWeight = (a: ArmPose, side: 1 | -1, yawB: number) => {
  const far = side * yawB > 0 ? Math.abs(yawB) : 0;
  if (far <= 0.12) return 1;
  // Wrist in shoulder space, in units of the whole arm (rig independent).
  const a1 = rad(a.shoulder);
  const a2 = rad(a.shoulder + a.elbow);
  const u = (Math.sin(a1) + Math.sin(a2) * 0.9) / 1.9;
  const v = (Math.cos(a1) + Math.cos(a2) * 0.9) / 1.9;
  const low = sstep(v, 0.45, 0.8);
  const close = 1 - sstep(u, 0.25, 0.5);
  return 1 - sstep(far, 0.12, 0.4) * low * close;
};
