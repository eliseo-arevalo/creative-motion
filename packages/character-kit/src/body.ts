import { clamp, smooth } from "./math";
import { hipY } from "./rig";
import { clipOf, evaluatePose } from "./timeline";
import { LEGS, gaitAt, kneeDrop, legLength, planFeet, solveLower, walkingAt, walkOffset, yawsAt, type FeetPlan, type LowerBody } from "./legs";
import type { ArmPose, Pose, PoseKey, Proportions, TurnKey, WalkKey } from "./types";

/** Footstep plan for a shot (pure; cache it per track / turn / walk). */
export const feetPlanOf = (keys: PoseKey[], turn: TurnKey[] | undefined, walk: WalkKey[] | undefined, fps: number, p: Proportions, seed = 0): FeetPlan =>
  planFeet(keys, turn, walk, fps, p, (k) => clipOf(k).pose, seed);

/** How much an arm hangs free (swings when walking): 1 by the side, 0 once raised or reaching. */
const freeArm = (a: ArmPose) => 1 - smooth(Math.abs(a.shoulder), 18, 26);

/**
 * The whole body at a frame: `evaluatePose` plus the lower body (planted feet, leg IK, hips that
 * sink to keep the feet down, pelvis tilt), the walk (hips carried along, arms swinging) and the
 * turn. The returned pose already includes all of it, so `forward(spec, pose)` (props, contacts,
 * the head) matches what is drawn.
 */
export const evaluateBody = (
  keys: PoseKey[],
  frame: number,
  fps: number,
  p: Proportions,
  opts: { turn?: TurnKey[]; walk?: WalkKey[]; plan?: FeetPlan; seed?: number } = {},
) => {
  const ev = evaluatePose(keys, frame, fps, p);
  const plan = opts.plan ?? feetPlanOf(keys, opts.turn, opts.walk, fps, p, opts.seed ?? 0);
  const yaw = yawsAt(opts.turn, opts.walk, frame, fps, p, plan.segs);
  const wk = walkingAt(opts.walk, frame, fps, p, plan.segs);
  let pose: Pose = ev.pose;
  // Carried along by the walk (unless the parent moves us), leaning a little into it.
  const lastSeg = plan.segs.filter((s) => frame >= s.t0).slice(-1)[0];
  const inPlace = lastSeg?.inPlace ?? false;
  const walked = inPlace ? 0 : walkOffset(opts.walk, frame, fps, p);
  const base = hipY(p) + pose.y + ev.dip * 6 + kneeDrop(p, pose.knees);
  // Lean into the walk, a little more on each push-off (and it eases back as the walk settles).
  const g = gaitAt(plan, frame);
  const push = 1.6 + 0.7 * Math.cos(2 * Math.PI * (g.phase - 0.7));
  const lowerIn: Pose = { ...pose, x: pose.x + walked, lean: pose.lean + wk.mix * push * wk.w };
  const lower: LowerBody = solveLower(p, plan, lowerIn, frame, yaw.body, ev.dip, base);
  const lag = lower.lag;
  const armK = LEGS.armSwing * (lower.gait?.arms ?? 1) * (lower.gait?.arm ?? 1);
  const swing = (a: ArmPose, side: 1 | -1, k: number, kl?: [number, number]): ArmPose => {
    if (lower.walk <= 0) return a;
    const f = freeArm(a);
    const fw = lower.dir * side; // + = this arm forward (shoulder units)
    // The far arm (turned away) swings back behind the body, not across it: its inward swing fades
    // with the turn, so it never sweeps over the torso it should be hidden behind.
    const far = Math.max(0, 1 - 2 * Math.max(0, side * yaw.body));
    const fade = (v: number) => (v < 0 ? v * far : v);
    const d = fade(armK * k * fw * f);
    if (!kl) return { ...a, shoulder: a.shoulder + d };
    // Loose elbow: it bends as the arm swings forward and trails the upper arm; the hand trails it.
    const flex = f * lower.walk * (5 + 11 * Math.max(0, kl[0]));
    const fore = fade(armK * 1.25 * kl[0] * fw * f + fw * flex);
    const hand = fade(armK * 1.4 * kl[1] * fw * f + fw * flex * 1.15);
    return { ...a, shoulder: a.shoulder + d, elbow: a.elbow + fore - d, wrist: a.wrist + hand - fore };
  };
  // Head: overlap on the hip arc (a small nod after each down).
  const nod = (lower.gait ? wk.mix * 1.1 * lower.gait.bounce * Math.cos(2 * Math.PI * (g.phase - 0.32)) : 0) * wk.w;
  pose = {
    ...lowerIn,
    y: pose.y + kneeDrop(p, pose.knees) + lower.sink,
    torso: pose.torso + lower.counter,
    head: pose.head + nod,
    armL: swing(pose.armL, -1, lower.swingL, lag?.L),
    armR: swing(pose.armR, 1, lower.swingR, lag?.R),
  };
  // Squash as the hips drop onto the legs (walk contact, landing), a few %.
  const squash = clamp(lower.sink / legLength(p), 0, 0.12) * 0.1;
  const prev = inPlace ? ev.prev : { ...ev.prev, x: ev.prev.x + walkOffset(opts.walk, frame - 3, fps, p) };
  return { pose, dip: ev.dip, prev, lower, plan, yawB: yaw.body, yawH: yaw.head, squash, walking: wk.w };
};
