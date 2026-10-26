import { clamp01, lerp } from "./math";
import type { HandFace, HandShape } from "./types";

/** Which side of each hand drawing faces the camera (0 palm, 90 edge, 180 back). */
export const NATIVE_ROLL: Record<HandShape, number> = {
  relaxed: 90,
  open: 0,
  flat: 180,
  fist: 180,
  point: 180,
  hold: 0,
  pinch: 180,
  count1: 0,
  count2: 0,
  count3: 0,
  shake: 90,
};

/** `HandFace` as a roll angle. */
export const FACE_ROLL: Record<HandFace, number> = { palm: 0, edge: 90, back: 180 };

const ease = (t: number) => t * t * (3 - 2 * t);
const RAD = Math.PI / 180;

/**
 * How a rolled hand is drawn: `sx` = horizontal scale of the drawing in hand space (negative =
 * mirrored, i.e. the other face of the hand), `view` = which way a held object faces the camera
 * (1 front … −1 turned toward the character). With no roll this is the identity (1, 1, no flip).
 * Flat drawings (palm / back) narrow to 30 % through the edge and flip there; edge-on drawings
 * (relaxed, shake) only narrow a little, they never flip. `mirror` (0…1) mirrors the drawing on top
 * (`sx` sign) without turning it over (`flipped` = the other face's marks are drawn).
 */
export const handRoll = (shape: HandShape, from: HandShape | undefined, mix: number | undefined, roll: number | undefined, mirror?: number) => {
  // Mirror (thumb on the other side): squeezes through zero width, like a turn through the edge.
  const mf = 1 - 2 * ease(clamp01(mirror ?? 0));
  if (roll === undefined) return { sx: mf, view: 1, flipped: false, native: NATIVE_ROLL[shape] };
  const t = clamp01(mix ?? 1);
  const native = from && from !== shape && t < 1 ? lerp(NATIVE_ROLL[from], NATIVE_ROLL[shape], ease(t)) : NATIVE_ROLL[shape];
  const rel = (roll - native) * RAD;
  const c = Math.cos(rel);
  const k = Math.abs(Math.cos(native * RAD)); // 1 = flat drawing, 0 = edge-on drawing
  const plate = Math.sign(c || 1) * (0.3 + 0.7 * Math.abs(c));
  const edge = 1 - 0.22 * Math.abs(Math.sin(rel));
  const sx = k * plate + (1 - k) * edge;
  return { sx: sx * mf, view: k * c + (1 - k), flipped: sx < 0, native };
};

/**
 * Which side of a hand the camera sees for a roll (unset = the drawing's own side): palm (roll
 * < 45°), edge, or back (> 135°).
 */
export const handFaceOf = (shape: HandShape, roll: number | undefined): HandFace => {
  const c = Math.cos((roll ?? NATIVE_ROLL[shape]) * RAD);
  return c > 0.7 ? "palm" : c < -0.7 ? "back" : "edge";
};
