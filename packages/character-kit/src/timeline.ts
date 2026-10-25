import { CLIPS } from "./clips";
import { clamp01, lerp, smooth, transition, wrap } from "./math";
import { REST } from "./poses";
import { armFrontWeight, blendEffector, effectorOf, solveEffector } from "./arm";
import { armPoints, limitArm, solveArmLocal } from "./rig";
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
});

/** A layer may swap the hand shape (with its own morph); it applies while the layer is mostly in. */
const handDelta = (a: ArmPose, d: PoseDelta["armL"], w: number): Partial<ArmPose> => {
  if (!d?.hand || w < 0.5) return {};
  return { hand: d.hand, handFrom: d.handFrom ?? a.hand, handMix: d.handFrom ? d.handMix ?? 1 : Math.min(1, (w - 0.5) * 2) };
};

export const addArmDelta = (a: ArmPose, d: PoseDelta["armL"], w = 1): ArmPose => ({
  ...a,
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
  if (keys.length === 0) return { pose: REST, dip: 0 };
  const clips = keys.map(clipOf);
  const ex = expandSteps(keys, clips);
  let pose = ex[0].pose;
  let dip = 0;
  const ts: number[] = [];
  for (let i = 1; i < ex.length; i++) {
    if (frame < ex[i].at) break;
    const tr = transition(frame - ex[i].at, fps, ex[i].antic);
    pose = blendPose(pose, ex[i].pose, tr.t);
    ts.push(tr.t);
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
  const arm = (side: 1 | -1, k: "armL" | "armR"): ArmPose => {
    let e = effectorOf(p, side, ex[0].pose[k], pose);
    ts.forEach((t, j) => {
      e = blendEffector(p, side, pose, e, effectorOf(p, side, ex[j + 1].pose[k], pose), t);
    });
    let a = solveEffector(p, side, pose, e);
    for (const [d, w] of armD[side < 0 ? "L" : "R"]) a = addArmDelta(a, d, w);
    return limitArm(p, a);
  };
  pose = { ...pose, armL: arm(-1, "armL"), armR: arm(1, "armR") };
  return { pose, dip };
};

/** Per-bone delays (frames): the core leads, extremities follow → overlap / follow-through. */
export const BONE_DELAY = { core: 0, torso: 1, shoulder: 1, neck: 2, elbow: 2, head: 3, hand: 3, wrist: 4 } as const;

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
    // Elbow fold direction, eased over the last frames (centred on the arm's 2-frame delay): when a
    // move changes it, the elbow swings through "toward the camera" over several frames.
    const bends = at.slice(0, 8).map((x) => x.pose[k].bendSign);
    if (bends.some((b) => b !== undefined) && bends.some((b) => b !== bends[0])) {
      const bend = bends.reduce<number>((s, b, i) => s + (b ?? Math.sign(at[i].pose[k].elbow) ?? 1), 0) / bends.length;
      const l1 = p.upperArm * (a.upper ?? 1);
      const l2 = p.foreArm * (a.fore ?? 1);
      const w = armPoints(l1, l2, a.shoulder, a.elbow).wrist;
      const ik = solveArmLocal(l1, l2, w.u, w.v, a.pole, bend);
      a = { ...a, shoulder: ik.shoulder, elbow: ik.elbow, upper: (a.upper ?? 1) * ik.k1, fore: (a.fore ?? 1) * ik.k2, bendSign: bend };
    }
    a.wrist = wrap(d4[k].shoulder + d4[k].elbow + d4[k].wrist - a.shoulder - a.elbow);
    return limitArm(p, a);
  };
  const pose: Pose = {
    x: d0.x,
    y: d0.y,
    lean: d0.lean,
    legL: d0.legL,
    legR: d0.legR,
    knees: d0.knees,
    torso: d1.torso,
    shrug: d1.shrug,
    neck: d2.neck,
    head: d3.head,
    armL: arm("armL"),
    armR: arm("armR"),
  };
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
