import { CLIPS } from "./clips";
import { CANVAS, forward, hipY, joints } from "./rig";
import { evaluatePose } from "./timeline";
import type { CharacterSpec, Clip, Pose } from "./types";

const reachOf = (spec: CharacterSpec, gripY: number) => {
  // Torso-space target for the wrist so the hand centre sits at canvas height `gripY`; reaching
  // lower or higher than natural brings the hand in (an arm never locks straight).
  const p = spec.proportions;
  const torsoY = gripY - hipY(p);
  const sh = joints(p).shoulder(1);
  const L = (p.upperArm + p.foreArm) * 0.9;
  const v = torsoY - sh.y;
  const x = Math.min(p.shoulderHalf + (p.upperArm + p.foreArm) * 0.62, sh.x + Math.sqrt(Math.max(0, L * L - v * v)));
  return { dx: x / p.hand, dy: torsoY / p.hand };
};

/** Handshake pose for `spec`, with its grip at canvas height `gripY` (default: its own waist height). */
export const handshakePose = (spec: CharacterSpec, gripY?: number): Pose => {
  const base = CLIPS.handshake.pose;
  if (gripY === undefined) return base;
  const r = reachOf(spec, gripY);
  return { ...base, armR: { ...base.armR, reach: { anchor: "torso", dx: r.dx, dy: r.dy } } };
};

/** Canvas grip point (middle of the palm edge, where the two hands clasp) once the pose has settled. */
const gripOf = (spec: CharacterSpec, pose: Pose) => {
  const settled = evaluatePose([{ at: 0, clip: { pose } }], 0, 30, spec.proportions).pose;
  return forward(spec, settled).armR.point(2, 40);
};

/**
 * Handshake between two characters: `a` stands on the left facing right, `b` on the right,
 * mirrored (scale(-1,1) on its group, or `flip`). Both get the same grip height (the average of
 * their natural ones) and `gap` is the distance between their canvas centres so the hands meet.
 * Play both clips from the same frame: the pumps are in sync.
 */
export const shakeHands = (a: CharacterSpec, b: CharacterSpec) => {
  const ya = gripOf(a, CLIPS.handshake.pose).y;
  const yb = gripOf(b, CLIPS.handshake.pose).y;
  const y = (ya + yb) / 2;
  const fit = (spec: CharacterSpec) => {
    // The reach is for the wrist and the grip sits a little ahead of it: correct a few times.
    let aim = y;
    let pose = handshakePose(spec, aim);
    for (let i = 0; i < 6; i++) {
      const dy = gripOf(spec, pose).y - y;
      if (Math.abs(dy) < 0.5) break;
      aim -= dy;
      pose = handshakePose(spec, aim);
    }
    return pose;
  };
  const pa = fit(a);
  const pb = fit(b);
  const ga = gripOf(a, pa);
  const gb = gripOf(b, pb);
  const gap = ga.x - CANVAS.centerX + (gb.x - CANVAS.centerX);
  // Same pump in pixels for both (the layer moves the hand in hand lengths, which differ).
  const ref = (a.proportions.hand + b.proportions.hand) / 2;
  const clip = (spec: CharacterSpec, pose: Pose): Clip => {
    const k = ref / spec.proportions.hand;
    const layer = CLIPS.handshake.layer!;
    return {
      ...CLIPS.handshake,
      pose,
      layer: (t) => {
        const d = layer(t);
        return { ...d, armR: d.armR && { ...d.armR, dy: (d.armR.dy ?? 0) * k } };
      },
    };
  };
  return { a: clip(a, pa), b: clip(b, pb), gap, gripY: y };
};

/** Distance between the two characters' canvas centres for a handshake (see `shakeHands`). */
export const handshakeGap = (a: CharacterSpec, b: CharacterSpec) => shakeHands(a, b).gap;
