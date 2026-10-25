import type { ReactNode } from "react";

/* ───────────────────────────── Skins (character spec) ───────────────────────────── */

export type Palette = {
  skin: string;
  skinShade: string;
  /** Nose / deep creases. */
  skinDeep: string;
  blush: string;
  /** Outlines, eyes, brows. */
  ink: string;
  mouth: string;
  tongue: string;
  teeth: string;
  /** Eye highlight. */
  light: string;
};

/** Bone lengths and widths in canvas px (canvas is 800×1500, feet on y = GROUND). */
export type Proportions = {
  /** Hip joint → base of the neck. */
  torso: number;
  shoulderHalf: number;
  /** Shoulder joint below the neck base. */
  shoulderDrop: number;
  waistHalf: number;
  hipHalf: number;
  neck: number;
  neckHalf: number;
  headRx: number;
  headRy: number;
  upperArm: number;
  foreArm: number;
  hand: number;
  /** Arm widths at shoulder, elbow, wrist. */
  armWidth: [number, number, number];
  thigh: number;
  shin: number;
  /** Leg widths at hip, knee, ankle. */
  legWidth: [number, number, number];
  legGap: number;
  /** Chest curve on the shirt (0 none … 1). */
  bust: number;
};

export type HairKind = "bun" | "lowBun" | "short" | "curly" | "bob";
export type HairSpec = { kind: HairKind; color: string; shade: string; shine?: string };

export type FaceShape = "oval" | "round" | "soft";
export type HeadSpec = {
  shape: FaceShape;
  eyeSize?: number;
  browWeight?: number;
  nose?: "curve" | "button" | "long";
  lashes?: boolean;
  /** Smile lines / crow's feet (older characters). */
  wrinkles?: boolean;
  freckles?: boolean;
};

export type SleeveLength = "none" | "short" | "threeQuarter" | "long";
export type TopSpec = {
  kind: "tee" | "blouse" | "polo";
  color: string;
  shade: string;
  sleeve: SleeveLength;
  /** Collar / neckline trim colour. */
  trim?: string;
  /** Repeating print (dots) colour. */
  pattern?: string;
};

export type BottomSpec = { kind: "skirt" | "pants" | "shorts"; color: string; shade: string };
export type ApronSpec = { kind: "bib" | "waist"; color: string; shade: string; outline: string; pocket?: string };
export type ShoesSpec = { color: string; sole?: string; socks?: string };

export type Accessory =
  | { kind: "glasses"; color: string }
  | { kind: "earrings"; color: string }
  | { kind: "cap"; color: string; brim: string }
  | { kind: "pencil"; color: string }
  | { kind: "necklace"; color: string }
  | { kind: "mustache"; color: string };

export type CharacterSpec = {
  name: string;
  palette: Palette;
  proportions: Proportions;
  head: HeadSpec;
  hair: HairSpec;
  top: TopSpec;
  bottom: BottomSpec;
  apron?: ApronSpec;
  shoes: ShoesSpec;
  accessories?: Accessory[];
  /** Breathing amplitude multiplier (default 1). */
  breath?: number;
};

/* ───────────────────────────── Poses ───────────────────────────── */

export type HandShape = "relaxed" | "open" | "flat" | "point" | "fist" | "hold" | "pinch" | "count1" | "count2" | "count3";

/** A point near the body the wrist should reach (solved per rig with 2-bone IK). */
export type ReachAnchor = "chin" | "cheek" | "ear" | "headTop" | "chest" | "pocket" | "hip" | "front";
export type Reach = {
  anchor: ReachAnchor;
  /** Offset in hand lengths (x outward from the body midline on that side, y down). */
  dx?: number;
  dy?: number;
  /** Legacy (stage 1). The elbow side now comes from the arm's `pole`; this is ignored. */
  bend?: 1 | -1;
};

/**
 * Arm angles in degrees, per bone and relative to the parent bone.
 * shoulder: 0 = upper arm hanging down, + raises it outward (away from the body), − crosses in front.
 * elbow: forearm relative to the upper arm, + keeps rotating outward/up, − folds in toward the body.
 * wrist: hand relative to the forearm (same sign).
 * Both arms use the same numbers (the left one is mirrored), so poses read symmetric.
 */
export type ArmPose = {
  shoulder: number;
  elbow: number;
  wrist: number;
  hand: HandShape;
  /** Morph source and amount (0 = handFrom, 1 = hand); filled in by the timeline during transitions. */
  handFrom?: HandShape;
  handMix?: number;
  /** Upper-arm length factor (foreshortening when the elbow comes toward camera). Default 1. */
  upper?: number;
  reach?: Reach;
  /** Hand direction in torso space (0 = down, 180 = up, + outward); overrides `wrist` after IK. */
  handDir?: number;
  /**
   * Which way the elbow points, as a direction in shoulder space [outward, down]. The IK always
   * puts the elbow on this side of the shoulder→wrist line (never inverted). Default: down, turning
   * outward as the hand rises above the shoulder.
   */
  pole?: [number, number];
  /** Forearm length factor (foreshortening), like `upper`. Default 1. */
  fore?: number;
  /**
   * Set by the arm solver: which way the elbow folds (sign of `elbow`), -1…1. A move whose keys fold
   * opposite ways crosses 0 once, around the point where the arm is most extended: there the elbow
   * swings through "pointing at the camera" (both bones foreshortened) instead of flipping sides.
   */
  bendSign?: number;
};

export type Pose = {
  /** Hip offset in px (weight shift / hop). */
  x: number;
  y: number;
  /** Whole-body lean around the hips (deg, + = top to screen right). */
  lean: number;
  /** Torso bend relative to the hips. */
  torso: number;
  neck: number;
  head: number;
  /** Shoulders raised (px). */
  shrug: number;
  /** Screen-left / screen-right arm. */
  armL: ArmPose;
  armR: ArmPose;
  /** Leg angles (deg from vertical, + outward) and knee bend (deg). */
  legL: number;
  legR: number;
  knees: number;
};

type ArmDelta = Partial<Pick<ArmPose, "shoulder" | "elbow" | "wrist" | "upper" | "hand" | "handFrom" | "handMix">>;
/** Additive offsets a gesture layers on top of its base pose. */
export type PoseDelta = Partial<Omit<Pose, "armL" | "armR">> & { armL?: ArmDelta; armR?: ArmDelta };

/* ───────────────────────────── Face ───────────────────────────── */

export type FaceParams = {
  /** Brows up (px). */
  browY: number;
  /** Inner ends up (+ worried) / down (− cross). */
  browTilt: number;
  /** One brow (screen-left) higher: the "hmm" brow. */
  browAsym: number;
  /** Upper lid closure 0…1. */
  lidTop: number;
  /** Cheek squint from below 0…1 (smiling eyes). */
  lidBottom: number;
  eyeScale: number;
  /** Mouth corners −1 (down) … 1 (up). */
  smile: number;
  open: number;
  wide: number;
  round: number;
  teeth: number;
  /** Lips pressed together (thicker line). */
  pressed: number;
  /** Mouth shifted to one side (px). */
  mouthX: number;
  blush: number;
  /** Extra pupil offset (px). */
  gazeX: number;
  gazeY: number;
};

export type ExpressionName = "neutral" | "happy" | "worried" | "deadpan" | "surprised" | "thinking";
/** Weights per expression, mixed on top of neutral (e.g. { worried: 0.6, thinking: 0.4 }). */
export type ExpressionMix = Partial<Record<ExpressionName, number>>;

/** Rhubarb Lip Sync mouth shapes (A–F basic, G H X extended). */
export type Viseme = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "X";
export type MouthCue = { start: number; end: number; value: Viseme };
export type MouthShape = { open: number; wide: number; round: number; teeth: number; tongue: number; bite: number; pressed: number };

/* ───────────────────────────── Tracks ───────────────────────────── */

export type Clip = {
  /** Base pose the body springs to. */
  pose: Pose;
  /**
   * Later poses inside the same gesture (frames after the clip starts), e.g. take the phone out →
   * look at it → to the ear. Each springs from the previous one; a new track key cuts the rest.
   */
  steps?: { at: number; pose: Pose; antic?: number }[];
  /** Additive, time-based motion on top (frames since the key, fps). */
  layer?: (t: number, fps: number) => PoseDelta;
  /** Anticipation strength for the move into this clip (default 0.12). */
  antic?: number;
};

export type PoseKey = { at: number } & ({ clip: string | Clip } | { pose: Pose });
export type FaceKey = { at: number; mix: ExpressionMix | ExpressionName; ease?: number };
export type LookTarget = { x: number; y: number } | "camera";
export type LookKey = { at: number; target: LookTarget };
/** Three-quarter turn: yaw −1 … 1 (±1 = full 3/4 view toward screen left / right). Springs in at `at`. */
export type TurnKey = { at: number; yaw: number };
export type SpeechClip = { from: number; cues: MouthCue[] };

/**
 * Draws a held object in hand space, centred on the grip slot. `worldAngle` is the hand's rotation
 * on screen (counter-rotate by it to keep an object upright); `shape` is the grip showing
 * ("hold" = wrapping grip, "pinch" = between thumb and index).
 */
export type HoldRender = (info: { side: "L" | "R"; worldAngle: number; shape: HandShape }) => ReactNode;
