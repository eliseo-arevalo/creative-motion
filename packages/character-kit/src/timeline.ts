import { CLIPS } from "./clips";
import { clamp, clamp01, lerp, smooth, transition, wrap, type SpringFeel } from "./math";
import { REST } from "./poses";
import { armFrontWeight, blendEffector, effectorOf, solveEffector } from "./arm";
import { NATIVE_ROLL } from "./roll";
import { armPoints, elbowFlexOf, headOval, limitArm, shoulderAt, solveArmLocal } from "./rig";
import type { ArmPose, Clip, Pose, PoseDelta, PoseKey, Proportions } from "./types";

const lerpArm = (a: ArmPose, b: ArmPose, t: number): ArmPose => ({
  shoulder: lerp(a.shoulder, b.shoulder, t),
  elbow: lerp(a.elbow, b.elbow, t),
  wrist: lerp(a.wrist, b.wrist, t),
  upper: lerp(a.upper ?? 1, b.upper ?? 1, t),
  // Fingers morph from a's shape to b's over the move (curl / open), no popping.
  ...(a.hand === b.hand ? { hand: b.hand } : { hand: b.hand, handFrom: a.handFrom && (a.handMix ?? 1) < 0.5 ? a.handFrom : a.hand, handMix: clamp01(t * 1.15 - 0.05) }),
});

/** Blend two resolved poses. t may overshoot (<0 or >1) for spring follow-through. */
export const blendPose = (a: Pose, b: Pose, t: number): Pose => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
  lean: lerp(a.lean, b.lean, t),
  torso: lerp(a.torso, b.torso, t),
  neck: lerp(a.neck, b.neck, t),
  head: lerp(a.head, b.head, t),
  shrug: lerp(a.shrug, b.shrug, t),
  armL: lerpArm(a.armL, b.armL, t),
  armR: lerpArm(a.armR, b.armR, t),
  legL: lerp(a.legL, b.legL, t),
  legR: lerp(a.legR, b.legR, t),
  knees: lerp(a.knees, b.knees, t),
  ...(a.weight !== undefined || b.weight !== undefined ? { weight: lerp(a.weight ?? 0, b.weight ?? 0, t) } : {}),
});

/** A layer may swap the hand shape (with its own morph); it applies while the layer is mostly in. */
const handDelta = (a: ArmPose, d: PoseDelta["armL"], w: number): Partial<ArmPose> => {
  if (!d?.hand || w < 0.5) return {};
  return { hand: d.hand, handFrom: d.handFrom ?? a.hand, handMix: d.handFrom ? d.handMix ?? 1 : Math.min(1, (w - 0.5) * 2) };
};

export const addArmDelta = (a: ArmPose, d: PoseDelta["armL"], w = 1): ArmPose => ({
  ...a,
  roll: d?.roll ? (a.roll ?? NATIVE_ROLL[a.hand]) + d.roll * w : a.roll,
  shoulder: a.shoulder + (d?.shoulder ?? 0) * w,
  elbow: a.elbow + (d?.elbow ?? 0) * w,
  wrist: a.wrist + (d?.wrist ?? 0) * w,
  upper: (a.upper ?? 1) + (d?.upper ?? 0) * w,
  ...handDelta(a, d, w),
});

export const addDelta = (p: Pose, d: PoseDelta, w = 1): Pose => ({
  ...p,
  x: p.x + (d.x ?? 0) * w,
  y: p.y + (d.y ?? 0) * w,
  lean: p.lean + (d.lean ?? 0) * w,
  torso: p.torso + (d.torso ?? 0) * w,
  neck: p.neck + (d.neck ?? 0) * w,
  head: p.head + (d.head ?? 0) * w,
  shrug: p.shrug + (d.shrug ?? 0) * w,
  legL: p.legL + (d.legL ?? 0) * w,
  legR: p.legR + (d.legR ?? 0) * w,
  knees: p.knees + (d.knees ?? 0) * w,
  ...(p.weight !== undefined || d.weight !== undefined ? { weight: (p.weight ?? 0) + (d.weight ?? 0) * w } : {}),
  armL: addArmDelta(p.armL, d.armL, w),
  armR: addArmDelta(p.armR, d.armR, w),
});

export const clipOf = (k: PoseKey): Clip => {
  if ("pose" in k) return { pose: k.pose };
  if (typeof k.clip === "string") {
    const c = (CLIPS as Record<string, Clip>)[k.clip];
    if (!c) throw new Error(`character-kit: unknown clip "${k.clip}"`);
    return c;
  }
  return k.clip;
};

/**
 * Arm moves: a much smaller wind-up than the body (hands don't pull back before reaching), less
 * overshoot (~3 %), and a pace that depends on the distance: short adjustments are quick, long
 * reaches take longer (people move hands at a roughly steady speed, not in a fixed time).
 */
export const ARM_FEEL: SpringFeel = { damping: 14, stiffness: 120, mass: 0.7 };
export const ARM_ANTIC = 0.35;
/** Arm blend curve: the pace scales the spring itself (stiffness × pace², damping × pace: same overshoot, longer or shorter move), sampled on whole frames. */
const armT = (dt: number, fps: number, antic: number, pace: number) =>
  transition(dt, fps, antic * ARM_ANTIC, { ...ARM_FEEL, stiffness: ARM_FEEL.stiffness * pace * pace, damping: ARM_FEEL.damping * pace }).t;
export const armPace = (dist: number, reach: number, contact: boolean) => clamp(1.14 - (0.34 * dist) / reach, 0.74, 1.12) * (contact ? 0.85 : 1);

/** Track keys plus the clips' internal steps, cut where the next track key starts. */
const expandSteps = (keys: PoseKey[], clips: Clip[]) => {
  const out: { at: number; pose: Pose; antic: number }[] = [];
  keys.forEach((k, i) => {
    const next = keys[i + 1]?.at ?? Infinity;
    out.push({ at: k.at, pose: clips[i].pose, antic: clips[i].antic ?? 0.12 });
    for (const st of clips[i].steps ?? []) if (k.at + st.at < next) out.push({ at: k.at + st.at, pose: st.pose, antic: st.antic ?? 0.06 });
  });
  return out;
};

/**
 * Pose at one frame. The body springs between key poses (with anticipation) plus the clips'
 * layers; the arms move in effector space (curved paths, contact approach, head avoidance) and
 * are solved with pole-aware IK, then the layers' arm motion and the joint limits are applied.
 */
export const poseAtFrame = (keys: PoseKey[], frame: number, fps: number, p: Proportions) => {
  if (keys.length === 0) return { pose: REST, dip: 0, touch: { armL: false, armR: false } };
  const clips = keys.map(clipOf);
  const ex = expandSteps(keys, clips);
  let pose = ex[0].pose;
  let dip = 0;
  const ts: { dt: number; antic: number }[] = [];
  for (let i = 1; i < ex.length; i++) {
    if (frame < ex[i].at) break;
    const tr = transition(frame - ex[i].at, fps, ex[i].antic);
    pose = blendPose(pose, ex[i].pose, tr.t);
    ts.push({ dt: frame - ex[i].at, antic: ex[i].antic });
    dip = tr.dip * ex[i].antic * 8;
  }
  const armD: { L: [PoseDelta["armL"], number][]; R: [PoseDelta["armL"], number][] } = { L: [], R: [] };
  for (let i = 0; i < keys.length; i++) {
    const layer = clips[i].layer;
    if (!layer || frame < keys[i].at) continue;
    const next = keys[i + 1]?.at ?? Infinity;
    const env = (i === 0 ? 1 : smooth(frame, keys[i].at, 6)) * (1 - smooth(frame, next, 8));
    if (env <= 0) continue;
    const d = layer(frame - keys[i].at, fps);
    pose = addDelta(pose, { ...d, armL: undefined, armR: undefined }, env);
    if (d.armL) armD.L.push([d.armL, env]);
    if (d.armR) armD.R.push([d.armR, env]);
  }
  const reach = p.upperArm + p.foreArm;
  // Whether each hand is at (or within a hand length of) a contact on the head, this frame.
  const touch = { armL: false, armR: false };
  const arm = (side: 1 | -1, k: "armL" | "armR"): ArmPose => {
    // Layer offsets of the wrist target (taps, presses, pumps), in hand lengths: x outward, y down.
    let ox = 0;
    let oy = 0;
    for (const [d, w] of armD[side < 0 ? "L" : "R"]) {
      ox += (d?.dx ?? 0) * w;
      oy += (d?.dy ?? 0) * w;
    }
    const off = { u: ox * p.hand, v: oy * p.hand };
    let e = effectorOf(p, side, ex[0].pose[k], pose);
    let prev = e;
    touch[k] = !!e.contact;
    ts.forEach((s, j) => {
      const target = effectorOf(p, side, ex[j + 1].pose[k], pose);
      const pace = armPace(Math.hypot(target.x - prev.x, target.y - prev.y), reach, target.contact || prev.contact);
      const last = j === ts.length - 1;
      e = blendEffector(p, side, pose, e, target, armT(s.dt, fps, s.antic, pace), {
        from: effectorOf(p, side, ex[j].pose[k], ex[j].pose),
        to: effectorOf(p, side, ex[j + 1].pose[k], ex[j + 1].pose),
        bodyFrom: ex[j].pose,
        bodyTo: ex[j + 1].pose,
      }, last ? off : undefined);
      prev = target;
      if (last) {
        const near = (q: { x: number; y: number; contact?: boolean }) => !!q.contact && Math.hypot(e.x - q.x, e.y - q.y) < p.hand;
        touch[k] = near(target) || near(effectorOf(p, side, ex[j].pose[k], pose));
      }
    });
    if (ts.length === 0 && (ox || oy)) e = { ...e, x: e.x + side * off.u, y: e.y + off.v };
    let a = solveEffector(p, side, pose, e);
    for (const [d, w] of armD[side < 0 ? "L" : "R"]) a = addArmDelta(a, d, w);
    return limitArm(p, a);
  };
  pose = { ...pose, armL: arm(-1, "armL"), armR: arm(1, "armR") };
  return { pose, dip, touch };
};

/** Per-bone delays (frames): the core leads, extremities follow → overlap / follow-through. */
export const BONE_DELAY = { core: 0, torso: 1, shoulder: 1, neck: 2, elbow: 2, head: 3, hand: 3, wrist: 4 } as const;

const WRIST_TRAIL = [0.3, 0.35, 0.22, 0.13];
/** Most the hand may trail its forearm (deg); open / flat hands (straight fingers) trail less. */
export const WRIST_LAG = 28;
export const WRIST_LAG_FLAT = 4;

/** How deep a hand point sits in the head oval (< 1 inside), over the palm centre and fingertips. */
const headDepth = (p: Proportions, b: Pose, side: 1 | -1, a: ArmPose, dir: number) => {
  const l1 = p.upperArm * (a.upper ?? 1);
  const l2 = p.foreArm * (a.fore ?? 1);
  const w = armPoints(l1, l2, a.shoulder, a.elbow).wrist;
  const s = shoulderAt(p, side, b.shrug);
  const o = headOval(p, b);
  const r = (-o.rot * Math.PI) / 180;
  const d = (dir * Math.PI) / 180;
  let m = Infinity;
  for (const f of [0.45, 0.85]) {
    const x = s.x + side * (w.u + Math.sin(d) * p.hand * f) - o.c.x;
    const y = s.y + w.v + Math.cos(d) * p.hand * f - o.c.y;
    const qx = x * Math.cos(r) - y * Math.sin(r);
    const qy = x * Math.sin(r) + y * Math.cos(r);
    m = Math.min(m, Math.hypot(qx / o.rx, qy / o.ry));
  }
  return m;
};

/**
 * A hand direction that keeps the hand out of the face, if `dir` does not: first between `dir` and
 * `lead` (giving way toward the forearm), else the nearest clear direction either way, else the
 * one that sits least deep. Directions are tried after the wrist's own range limit.
 */
const handClear = (p: Proportions, b: Pose, side: 1 | -1, a: ArmPose, dir: number, lead: number): ArmPose | undefined => {
  const SAFE = 1.12;
  if (headDepth(p, b, side, a, dir) >= SAFE) return undefined;
  const base = a.shoulder + a.elbow;
  const at = (d: number) => {
    const q = limitArm(p, { ...a, wrist: wrap(d - base) });
    return { q, k: headDepth(p, b, side, q, base + q.wrist) };
  };
  const span = wrap(lead - dir);
  for (let i = 1; i <= 8; i++) {
    const c = at(dir + (span * i) / 8);
    if (c.k >= SAFE) return c.q;
  }
  let best = at(dir);
  for (let i = 1; i <= 12; i++)
    for (const sg of [1, -1]) {
      const c = at(dir + sg * i * 15);
      if (c.k >= SAFE) return c.q;
      if (c.k > best.k + 0.02) best = c;
    }
  return best.q;
};

/** Final pose for a frame with overlapping action applied per bone. */
export const evaluatePose = (keys: PoseKey[], frame: number, fps: number, p: Proportions) => {
  const at = [0, 1, 2, 3, 4, 5, 6, 7].map((d) => poseAtFrame(keys, frame - d, fps, p));
  const [d0, d1, d2, d3, d4] = at.map((a) => a.pose);
  // Shoulder and elbow come from the same solve (the wrist stays where the IK put it); the hand's
  // direction trails two frames behind (follow-through), within the wrist's range.
  const arm = (k: "armL" | "armR"): ArmPose => {
    let a: ArmPose = {
      shoulder: d2[k].shoulder,
      elbow: d2[k].elbow,
      wrist: 0,
      upper: d2[k].upper,
      pole: d2[k].pole,
      bendSign: d2[k].bendSign,
      fore: d2[k].fore,
      hand: d3[k].hand,
      handFrom: d3[k].handFrom,
      handMix: d3[k].handMix,
    };
    const rolls = [d3, d4, at[5].pose, at[6].pose].map((x) => x[k].roll);
    if (rolls.every((r) => r !== undefined)) a.roll = (rolls as number[]).reduce((s, r, i) => s + r * WRIST_TRAIL[i], 0);
    else if (d4[k].roll !== undefined) a.roll = d4[k].roll;
    if (d3[k].mirror !== undefined || d4[k].mirror !== undefined) a.mirror = ((d3[k].mirror ?? 0) + (d4[k].mirror ?? 0)) / 2;
    // Elbow fold direction, eased over the last frames (centred on the arm's 2-frame delay): when a
    // move changes it, the elbow swings through "toward the camera" over several frames.
    // Wrist path low-passed over three frames (1-2-1): a one-frame burst of speed is spread out.
    const LP = [d1, d2, d3];
    const LW = [0.25, 0.5, 0.25];
    const ws = LP.map((x) => armPoints(p.upperArm * (x[k].upper ?? 1), p.foreArm * (x[k].fore ?? 1), x[k].shoulder, x[k].elbow).wrist);
    const wu = ws.reduce((s, w, i) => s + w.u * LW[i], 0);
    const wv = ws.reduce((s, w, i) => s + w.v * LW[i], 0);
    const w2 = ws[(ws.length - 1) / 2];
    {
      const l1 = p.upperArm * (a.upper ?? 1);
      const l2 = p.foreArm * (a.fore ?? 1);
      const bs = LP.map((x) => x[k].bendSign);
      if (bs.every((b) => b !== undefined && b === bs[0]) && Math.hypot(wu - w2.u, wv - w2.v) > 0.5) {
        const ik = solveArmLocal(l1, l2, wu, wv, a.pole, bs[0], elbowFlexOf(a.upper));
        if (Math.abs(wrap(ik.elbow - a.elbow)) < 75) a = { ...a, shoulder: ik.shoulder, elbow: ik.elbow, upper: (a.upper ?? 1) * ik.k1, fore: (a.fore ?? 1) * ik.k2 };
      }
    }
    const bends = at.slice(0, 8).map((x) => x.pose[k].bendSign);
    if (bends.some((b) => b !== undefined) && bends.some((b) => b !== bends[0])) {
      const bend = bends.reduce<number>((s, b, i) => s + (b ?? Math.sign(at[i].pose[k].elbow) ?? 1), 0) / bends.length;
      const l1 = p.upperArm * (a.upper ?? 1);
      const l2 = p.foreArm * (a.fore ?? 1);
      const ik = solveArmLocal(l1, l2, wu, wv, a.pole, bend, elbowFlexOf(a.upper));
      a = { ...a, shoulder: ik.shoulder, elbow: ik.elbow, upper: (a.upper ?? 1) * ik.k1, fore: (a.fore ?? 1) * ik.k2, bendSign: bend };
    }
    // The hand trails the forearm with a soft drag: a weighted average of its recent directions
    // (about 2 frames behind the forearm), never more than 28° behind — 4° for an open / flat hand,
    // whose straight fingers would make a bigger lag read as a broken wrist.
    const dirOf = (x: Pose) => x[k].shoulder + x[k].elbow + x[k].wrist;
    const d4dir = dirOf(d4);
    const trail = [d3, d4, at[5].pose, at[6].pose].reduce((s, x, i) => s + wrap(dirOf(x) - d4dir) * WRIST_TRAIL[i], 0);
    const lead = wrap(dirOf(d2) - d4dir);
    const flat = a.hand === "open" || a.hand === "flat";
    const dir = d4dir + clamp(trail, Math.min(lead, 0) - WRIST_LAG, Math.max(lead, 0) + WRIST_LAG);
    a.wrist = wrap(dir - a.shoulder - a.elbow);
    // Measured against the forearm actually drawn (after the re-solves above), around the hand
    // direction of the move (continuous even when the raw keys' elbow changes fold); a soft limit,
    // so the trail reverses smoothly when the forearm swings back (no flick).
    if (flat) {
      const w0 = wrap(dirOf(d2) - a.shoulder - a.elbow);
      a.wrist = w0 + WRIST_LAG_FLAT * Math.tanh(wrap(a.wrist - w0) / (3 * WRIST_LAG_FLAT));
    }
    leads[k] = dirOf(d2);
    return limitArm(p, a);
  };
  const leads: Record<"armL" | "armR", number> = { armL: 0, armR: 0 };
  // Contrapposto: the hips slide over the weight-bearing foot, the shoulders tilt the other way.
  const wt = clamp(d0.weight ?? 0, -1, 1);
  // Follow-through: a fast arm swing nudges the torso the other way (and it settles back), ≤ 1.5°.
  const armSpin = (x: Pose, y: Pose) => (x.armL.shoulder - y.armL.shoulder) - (x.armR.shoulder - y.armR.shoulder);
  const react = clamp(armSpin(d1, d3) * 0.035 + armSpin(d3, at[5].pose) * 0.02, -1.5, 1.5);
  const pose: Pose = {
    x: d0.x + wt * p.legGap * 0.7,
    y: d0.y,
    lean: d0.lean,
    legL: d0.legL,
    legR: d0.legR,
    knees: d0.knees,
    ...(d0.weight !== undefined ? { weight: wt } : {}),
    torso: d1.torso + wt * 1.6 + react,
    shrug: d1.shrug,
    neck: d2.neck,
    head: d3.head,
    armL: arm("armL"),
    armR: arm("armR"),
  };
  // The trailing hand must not sweep into the face: where the dragged direction would put the hand
  // inside the head (and the forearm's own direction would not), it gives way toward the forearm.
  for (const [k, side] of [["armL", -1], ["armR", 1]] as const) {
    const a = pose[k];
    if (at.slice(1, 5).some((x) => x.touch[k])) continue;
    const base = a.shoulder + a.elbow;
    const fix = handClear(p, pose, side, a, base + a.wrist, leads[k]);
    if (fix !== undefined) pose[k] = fix;
  }
  return { pose, dip: at[0].dip, prev: d3 };
};

/**
 * Front/behind layer weight of an arm (1 = in front of torso and face), averaged over the last
 * few frames so the crossfade between layers is gradual and never flickers.
 */
export const armFrontAt = (keys: PoseKey[], frame: number, fps: number, p: Proportions, side: 1 | -1, yawB: number) => {
  if (yawB * side <= 0.12) return 1;
  let w = 0;
  for (let k = 0; k < 5; k++) {
    const pose = poseAtFrame(keys, frame - 2 - k * 2, fps, p).pose;
    w += armFrontWeight(side < 0 ? pose.armL : pose.armR, side, yawB);
  }
  return w / 5;
};
