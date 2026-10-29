import { useId, type ReactNode } from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors } from "../tokens";
import { drift, ease, lerp, springIn } from "./motion";

// Cut-paper palette for the character (brand colours + skin tones and one shade each).
const skin = "#E2A47C";
const skinShade = "#C9825C";
const skinDeep = "#B06E4B";
const blush = "#E27F6A";
const mouthDark = "#6E2A25";
const tongue = "#E58F7F";
const shirtShade = colors.primaryDeep;

/** v6 poses + reel poses (give: hand an item across the counter; think: worried hand on the cheek; reach: arm up, gripping). */
export type Pose = "idle" | "wave" | "point" | "phone" | "cheer" | "give" | "think" | "reach" | "relief" | "worry" | "scratch" | "chin" | "deadpan" | "pocket";
export type PoseKey = { at: number; pose: Pose };

/** [upper-arm angle, forearm angle, wrist bend], degrees (SVG: 0 = right, 90 = down). */
type Arm = [upper: number, fore: number, wrist: number];
type PoseDef = {
  left: Arm;
  right: Arm;
  /** How open the fingers are (0 relaxed curl … 1 spread). */
  open: [number, number];
  /** 0 = hand seen from the side (thumb forward, palm to the body); 1 = palm to camera. */
  front: [number, number];
  /** Right index finger extended. */
  pointer: number;
  head: number;
  lean: number;
  smile: number;
  /** Worried brows (inner ends up). Optional so the v6 poses stay byte-identical. */
  brow?: number;
  /** Pressed, down-turned lips instead of the open mouth (0…1). Optional, like `brow`. */
  frown?: number;
  /** Pupil offset [x, y] in viewBox px (where she looks). */
  gaze?: [number, number];
  /** Right hand scratches (small forearm/wrist jitter), e.g. at the side of the head. */
  scratch?: number;
  /** Empty hand: never shows the phone prop, even when the arm passes the phone angle. */
  empty?: number;
  /** Heavy upper eyelids (0 open … 1 half-closed), for the deadpan "otra vez" look. Optional; 0 draws nothing. */
  lids?: number;
};

// Resting arms hang relaxed at the sides, elbows soft; hands side-on, fingers pointing down.
const REST_L: Arm = [99, 94, -6];
const REST_R: Arm = [81, 86, 6];
/** The figure sits a bit higher behind the counter so hanging hands stay in view. */
const BODY_LIFT = -60;

const POSES: Record<Pose, PoseDef> = {
  idle: { left: REST_L, right: REST_R, open: [0.2, 0.2], front: [0, 0], pointer: 0, head: 0, lean: 0, smile: 0.25 },
  // Right arm up, palm to camera; head tilts toward the wave, weight shifts onto that side.
  wave: { left: REST_L, right: [-48, -96, 0], open: [0.2, 1], front: [0, 1], pointer: 0, head: 6, lean: 2.2, smile: 0.9 },
  point: { left: REST_L, right: [10, -14, -4], open: [0.2, 0.3], front: [0, 0], pointer: 1, head: 4, lean: 1.5, smile: 0.5 },
  phone: { left: REST_L, right: [82, -116, 10], open: [0.2, 0.35], front: [0, 0], pointer: 0, head: 7, lean: 0.5, smile: 0.35 },
  cheer: { left: [-128, -88, 0], right: [-52, -92, 0], open: [1, 1], front: [1, 1], pointer: 0, head: -2, lean: 0, smile: 1 },
  // Reel poses. Hand across the counter (elbow low, forearm level), hand side-on holding the item.
  give: { left: REST_L, right: [38, -4, 4], open: [0.2, 0.3], front: [0, 0], pointer: 0, head: 5, lean: 2.6, smile: 0.7 },
  // Elbow out, palm on the cheek: "¿y ahora?".
  think: { left: REST_L, right: [-55, -154, -14], open: [0.2, 0.4], front: [0, 0], pointer: 0, head: 8, lean: -0.8, smile: 0, brow: 1, frown: 1, gaze: [2, -3] },
  // Arm straight up, side-on hand gripping (pulling the shop's shutter).
  reach: { left: REST_L, right: [-84, -92, 0], open: [0.2, 0.2], front: [0, 0], pointer: 0, head: -4, lean: 1.2, smile: 0.6 },
  // Arms at rest, head tilted, eyes smiling: "listo, todo en orden".
  relief: { left: REST_L, right: REST_R, open: [0.2, 0.2], front: [0, 0], pointer: 0, head: -6, lean: -1, smile: 0.95 },
  // Worried: head down toward the counter, lips pressed, brows up in the middle.
  worry: { left: REST_L, right: REST_R, open: [0.15, 0.15], front: [0, 0], pointer: 0, head: 5, lean: -1.4, smile: 0, brow: 1, frown: 1, gaze: [-2, 6] },
  // Scratching the side of the head (arm up, wrist bent onto the hair), looking off into the distance.
  scratch: { left: REST_L, right: [-98, -100, -40], open: [0.3, 0.5], front: [0, 0], pointer: 0, head: 2, lean: -0.6, smile: 0, brow: 1, frown: 0.9, gaze: [-6, -5], scratch: 1 },
  // Hand under the chin (forearm across the chest), pensive, looking off to the side.
  chin: { left: REST_L, right: [160, -95, -10], open: [0.25, 0.3], front: [0, 0], pointer: 0, head: -4, lean: -0.8, smile: 0, brow: 1, frown: 1, gaze: [-6, -4], empty: 1 },
  // Straight to camera, heavy lids, flat pressed mouth: "otra vez…" (sketch beat).
  deadpan: { left: REST_L, right: REST_R, open: [0.15, 0.15], front: [0, 0], pointer: 0, head: 1.5, lean: -0.4, smile: 0, frown: 0.62, gaze: [0, 2], lids: 1 },
  // Right hand tucked into the apron pocket (stashing a bill), casual: "ahorita lo anoto".
  pocket: { left: REST_L, right: [86, 172, -10], open: [0.2, 0.15], front: [0, 0], pointer: 0, head: -3, lean: 0.8, smile: 0.55, gaze: [-3, 2], empty: 1 },
};

const UPPER = 112;
const FORE = 96;
const SHOULDER_L = { x: 344, y: 434 };
const SHOULDER_R = { x: 588, y: 434 };
const HIP = { x: 466, y: 615 };
const WAIST_Y = 488;
const NECK = { x: 466, y: 336 };
const WAVE_PERIOD = 15; // frames per hand swing (~2 waves a second)

const rad = (deg: number) => (deg * Math.PI) / 180;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

const blend = (a: PoseDef, b: PoseDef, t: number): PoseDef => {
  const c = clamp01(t);
  return {
    left: [lerp(a.left[0], b.left[0], t), lerp(a.left[1], b.left[1], t), lerp(a.left[2], b.left[2], t)],
    right: [lerp(a.right[0], b.right[0], t), lerp(a.right[1], b.right[1], t), lerp(a.right[2], b.right[2], t)],
    open: [lerp(a.open[0], b.open[0], c), lerp(a.open[1], b.open[1], c)],
    front: [lerp(a.front[0], b.front[0], c), lerp(a.front[1], b.front[1], c)],
    pointer: lerp(a.pointer, b.pointer, c),
    head: lerp(a.head, b.head, t),
    lean: lerp(a.lean, b.lean, t),
    smile: lerp(a.smile, b.smile, c),
    brow: lerp(a.brow ?? 0, b.brow ?? 0, c),
    frown: lerp(a.frown ?? 0, b.frown ?? 0, c),
    gaze: [lerp(a.gaze?.[0] ?? 0, b.gaze?.[0] ?? 0, c), lerp(a.gaze?.[1] ?? 0, b.gaze?.[1] ?? 0, c)],
    scratch: lerp(a.scratch ?? 0, b.scratch ?? 0, c),
    empty: Math.max(a.empty ?? 0, b.empty ?? 0) * (c > 0 && c < 1 ? 1 : c >= 1 ? (b.empty ?? 0) : (a.empty ?? 0)),
    lids: lerp(a.lids ?? 0, b.lids ?? 0, c),
  };
};

/**
 * Transition curve between two poses: a small anticipation (moves the other way first),
 * then a slightly under-damped spring so the limb overshoots and settles.
 */
const transitionCurve = (dt: number, fps: number) => {
  if (dt <= 0) return { t: 0, dip: 0 };
  const antic = dt < 7 ? -0.12 * Math.sin((Math.PI * dt) / 7) : 0;
  const main = dt > 3 ? spring({ frame: dt - 3, fps, config: { damping: 11, stiffness: 120, mass: 0.7 } }) : 0;
  return { t: antic + main, dip: -antic };
};

/** Pose at a frame, plus the wave envelope/phase and the anticipation dip for body weight. */
export const poseAt = (frame: number, keys: PoseKey[], fps = 30) => {
  let current: PoseDef = POSES[keys[0]?.pose ?? "idle"];
  let waveWeight = keys[0]?.pose === "wave" ? 1 : 0;
  let waveStart = keys[0]?.pose === "wave" ? keys[0].at : 0;
  let dip = 0;
  for (let i = 1; i < keys.length; i++) {
    if (frame < keys[i].at) break;
    const { t, dip: d } = transitionCurve(frame - keys[i].at, fps);
    current = blend(current, POSES[keys[i].pose], t);
    dip = d;
    if (keys[i].pose === "wave") {
      waveStart = keys[i].at + 6;
      waveWeight = lerp(waveWeight, 1, ease(frame, keys[i].at + 6, 10));
    } else {
      waveWeight = lerp(waveWeight, 0, ease(frame, keys[i].at, 8));
    }
  }
  return { ...current, waveWeight, waveStart, dip };
};

/**
 * Right wrist in the 900×820 viewBox at a frame (same math as the render, lean ignored),
 * so a scene can attach props that the hand drags (e.g. the shutter's bottom bar).
 */
export const rightWristAt = (frame: number, poses: PoseKey[], fps = 30, seed = 0) => {
  const pose = poseAt(frame, poses, fps);
  const breath = Math.sin((frame + seed) / 14);
  const lift = Math.max(0, -Math.sin(rad(pose.right[0]))) * 8;
  const bodyY = BODY_LIFT + breath * 2.5 + pose.dip * 40;
  const e = { x: SHOULDER_R.x + Math.cos(rad(pose.right[0])) * UPPER, y: SHOULDER_R.y - lift + Math.sin(rad(pose.right[0])) * UPPER };
  return { x: e.x + Math.cos(rad(pose.right[1])) * FORE, y: e.y + Math.sin(rad(pose.right[1])) * FORE + bodyY };
};

/** Blink every ~3.2 s, offset by seed so two characters never blink together. */
const eyeOpen = (frame: number, seed: number) => {
  const cycle = (frame + seed) % 96;
  return cycle < 2 ? 0.1 : cycle < 4 ? 0.45 : 1;
};

/** Open hand, palm to camera (wave / cheer). Local space: fingers along +x. */
const FrontHand: React.FC<{ open: number; s: number }> = ({ open, s }) => {
  const fingers = [-24, -8, 8, 23].map((a, i) => {
    const spread = rad(a * (0.3 + open * 0.7));
    const l = (12 + open * 30) * [0.92, 1, 0.97, 0.8][i];
    const base = { x: 26, y: [-12, -4, 4, 12][i] * s };
    return { base, tip: { x: base.x + Math.cos(spread) * l, y: base.y + Math.sin(spread) * l * s } };
  });
  return (
    <>
      {fingers.map((f, i) => (
        <g key={i}>
          <line x1={f.base.x} y1={f.base.y} x2={f.tip.x} y2={f.tip.y} stroke={skinShade} strokeWidth="15" strokeLinecap="round" />
          <line x1={f.base.x} y1={f.base.y} x2={f.tip.x} y2={f.tip.y} stroke={skin} strokeWidth="11" strokeLinecap="round" />
        </g>
      ))}
      <ellipse cx="18" cy="0" rx="24" ry="21" fill={skin} />
      <line x1="8" y1={-10 * s} x2={18 + open * 10} y2={(-26 - open * 10) * s} stroke={skinShade} strokeWidth="16" strokeLinecap="round" />
      <line x1="8" y1={-10 * s} x2={18 + open * 10} y2={(-26 - open * 10) * s} stroke={skin} strokeWidth="12" strokeLinecap="round" />
    </>
  );
};

/**
 * Hand seen from the side: palm toward the body, back of the hand and thumb forward,
 * fingers together and softly curled. `pointer` extends the index finger.
 * Local space: fingers along +x; `s` puts the thumb on the outer (camera) edge.
 */
const SideHand: React.FC<{ s: number; pointer: number }> = ({ s, pointer }) => {
  // Seen edge-on: what faces the camera is the thumb lying over the index finger;
  // the palm faces the body. Fingers together, tips curling slightly toward the palm.
  const curl = 1 - pointer;
  const len = 46 - pointer * 10;
  return (
    <>
      <path
        d={`M-4 ${-12 * s}C16 ${-14 * s} ${len - 12} ${-13 * s} ${len} ${-6 * s}C${len + 7} ${-1 * s} ${len + 4} ${(8 + curl * 4) * s} ${len - 6} ${(12 + curl * 2) * s}C${len - 20} ${15 * s} 14 ${14 * s} -4 ${12 * s}Z`}
        fill={skin}
        stroke={skinShade}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Curled fingertips. */}
      {curl > 0.3 && <path d={`M${len - 14} ${4 * s}Q${len - 4} ${2 * s} ${len - 2} ${10 * s}`} stroke={skinShade} strokeWidth="2.5" strokeLinecap="round" opacity="0.75" />}
      {pointer > 0.05 && (
        <>
          <line x1={len - 8} y1={-6 * s} x2={len - 8 + 36 * pointer} y2={-8 * s} stroke={skinShade} strokeWidth="13" strokeLinecap="round" />
          <line x1={len - 8} y1={-6 * s} x2={len - 8 + 36 * pointer} y2={-8 * s} stroke={skin} strokeWidth="9.5" strokeLinecap="round" />
        </>
      )}
      {/* Thumb in front, along the index finger. */}
      <path d={`M2 ${-4 * s}Q16 ${-12 * s} 32 ${-6 * s}`} stroke={skinShade} strokeWidth="14" strokeLinecap="round" />
      <path d={`M2 ${-4 * s}Q16 ${-12 * s} 32 ${-6 * s}`} stroke={skin} strokeWidth="10" strokeLinecap="round" />
      <path d={`M24 ${-3 * s}l7 ${-1 * s}`} stroke={skinShade} strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
    </>
  );
};

const Hand: React.FC<{ x: number; y: number; angle: number; open: number; front: number; pointer: number; mirror?: boolean }> = ({ x, y, angle, open, front, pointer, mirror }) => {
  const s = mirror ? -1 : 1;
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`}>
      {front > 0.5 ? <FrontHand open={open} s={s} /> : <g transform="translate(-4 0) scale(1.08 1.32)"><SideHand s={-s} pointer={pointer} /></g>}
    </g>
  );
};

const ArmShape: React.FC<{ shoulder: { x: number; y: number }; arm: Arm; open: number; front: number; pointer?: number; mirror?: boolean; far?: boolean }> = ({
  shoulder,
  arm,
  open,
  front,
  pointer = 0,
  mirror,
  far,
}) => {
  const [a1, a2, w] = arm;
  const elbow = { x: shoulder.x + Math.cos(rad(a1)) * UPPER, y: shoulder.y + Math.sin(rad(a1)) * UPPER };
  const wrist = { x: elbow.x + Math.cos(rad(a2)) * FORE, y: elbow.y + Math.sin(rad(a2)) * FORE };
  const sleeveEnd = { x: shoulder.x + Math.cos(rad(a1)) * UPPER * 0.55, y: shoulder.y + Math.sin(rad(a1)) * UPPER * 0.55 };
  const tone = far ? "#D99A72" : skin;
  return (
    <g>
      {/* One continuous limb: upper arm and forearm share the elbow cap, so there is no seam. */}
      <path d={`M${shoulder.x} ${shoulder.y}L${elbow.x} ${elbow.y}`} stroke={tone} strokeWidth="38" strokeLinecap="round" />
      <path d={`M${elbow.x} ${elbow.y}L${wrist.x} ${wrist.y}`} stroke={tone} strokeWidth="32" strokeLinecap="round" />
      {/* Short sleeve with a hem line. */}
      <path d={`M${shoulder.x} ${shoulder.y}L${sleeveEnd.x} ${sleeveEnd.y}`} stroke={colors.primary} strokeWidth="54" strokeLinecap="round" />
      <Hand x={wrist.x} y={wrist.y} angle={a2 + w} open={open} front={front} pointer={pointer} mirror={mirror} />
    </g>
  );
};

/**
 * Cut-paper shopkeeper ("la tendera"): two-segment arms with sleeves and hands (side-on at
 * rest, palm to camera only when waving/cheering), pose springs with anticipation/overshoot,
 * a wave with wrist follow-through, head tilt, weight shift, blink, breathing, an expressive
 * smile and an apron with a little secondary motion.
 * ViewBox 900×820 (same as the v5 CounterArt, so it drops into old layouts).
 */
export const Shopkeeper: React.FC<{
  poses?: PoseKey[];
  enterAt?: number;
  withCounter?: boolean;
  seed?: number;
  /** Background arch behind the figure (defaults to withCounter, as in v6). */
  arch?: boolean;
  /** Item held in the right hand, drawn behind the fingers; gets the wrist point and forearm angle. */
  holding?: (wrist: { x: number; y: number; angle: number }) => ReactNode;
  /** Frame of a sigh: shoulders rise, then drop a bit lower and settle. */
  sighAt?: number;
  /** Optional mood clamp for every pose (e.g. a busy/stressed beat): caps the smile, raises the brows. */
  smileCap?: number;
  browMin?: number;
}> = ({ poses = [{ at: 0, pose: "idle" }], enterAt, withCounter = true, seed = 0, arch, holding, sighAt, smileCap, browMin }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const clip = useId();
  const enter = enterAt === undefined ? 1 : springIn(frame, enterAt, fps, 30);
  const pose = poseAt(frame, poses, fps);
  const prev = poseAt(frame - 5, poses, fps);

  // Wave: forearm swings around the elbow; the wrist lags behind (follow-through).
  const phase = ((frame - pose.waveStart) / WAVE_PERIOD) * Math.PI * 2;
  const ww = pose.waveWeight;
  const sc = pose.scratch ?? 0;
  const right: Arm = [
    pose.right[0] + Math.sin(phase - 0.4) * 4 * ww,
    pose.right[1] + Math.sin(phase) * 20 * ww + Math.sin(frame * 1.25) * 6 * sc,
    pose.right[2] + Math.sin(phase - 1.1) * 26 * ww + Math.sin(frame * 1.25 + 1) * 12 * sc,
  ];
  const left = pose.left;

  const breath = Math.sin((frame + seed) / 14);
  const lift = Math.max(0, -Math.sin(rad(right[0]))) * 8; // shoulder rises with a raised arm
  const sg = sighAt === undefined ? -1 : frame - sighAt;
  const sigh = sg < 0 || sg > 46 ? 0 : sg < 18 ? -14 * Math.sin((Math.PI / 2) * (sg / 18)) : -14 + 20 * ease(frame, sighAt! + 18, 14) - 6 * ease(frame, sighAt! + 32, 14);
  const bodyY = BODY_LIFT + (1 - enter) * 760 + breath * 2.5 + pose.dip * 40 + sigh;
  const headTilt = pose.head + drift(frame + 20 + seed, 120, 1.4) + Math.sin(phase - 1.6) * 1.6 * ww;
  const headY = -breath * 1.5 + Math.sin(phase * 2) * 1.2 * ww;
  const eye = eyeOpen(frame, seed);
  const joy = smileCap === undefined ? pose.smile : Math.min(pose.smile, smileCap);
  const worry = browMin === undefined ? (pose.brow ?? 0) : Math.max(pose.brow ?? 0, browMin);
  const frown = pose.frown ?? 0;
  const [gx, gy] = pose.gaze ?? [0, 0];
  const happy = Math.max(0, (joy - 0.7) / 0.3);
  const phoneWeight = Math.max(0, 1 - Math.abs(pose.right[1] + 116) / 40) * (pose.right[0] > 60 ? 1 : 0) * (1 - (pose.empty ?? 0));
  const shoulderR = { x: SHOULDER_R.x, y: SHOULDER_R.y - lift };

  // Secondary motion: the apron skirt trails the body's lean (velocity) and breathes;
  // the waist-tie tails swing a little behind that.
  const leanVel = pose.lean - prev.lean + (pose.dip - prev.dip) * 6;
  const sway = -leanVel * 2.2 + Math.sin((frame + seed) / 14 - 0.8) * 0.5 + Math.sin(phase) * 0.5 * ww;
  const tail = sway * 1.8 + Math.sin((frame + seed) / 11) * 3;

  const wrist = (shoulder: { x: number; y: number }, [a1, a2]: Arm) => {
    const e = { x: shoulder.x + Math.cos(rad(a1)) * UPPER, y: shoulder.y + Math.sin(rad(a1)) * UPPER };
    return { x: e.x + Math.cos(rad(a2)) * FORE, y: e.y + Math.sin(rad(a2)) * FORE };
  };
  const rWrist = wrist(shoulderR, right);

  const mw = 22 + joy * 6;
  const top = 292 - joy * 3;
  const low = 297 + joy * 22;

  return (
    <svg width="100%" height="100%" viewBox="0 0 900 820" fill="none">
      <defs>
        <clipPath id={clip}>
          <rect x="-200" y="-200" width="1300" height="828" />
        </clipPath>
      </defs>
      {(arch ?? withCounter) && <path d="M106 638V250C106 -60 796 -60 796 250V638Z" fill={colors.primarySoft} />}
      <g clipPath={`url(#${clip})`}>
        <g transform={`translate(0 ${bodyY}) rotate(${pose.lean} ${HIP.x} ${HIP.y})`}>
          {/* Torso: rounded shoulders, a soft waist and hips; shaded side; breathes. */}
          <g transform={`translate(${HIP.x} ${HIP.y}) scale(${1 + breath * 0.006} ${1 + breath * 0.012}) translate(${-HIP.x} ${-HIP.y})`}>
            <path
              d="M400 348C356 352 330 372 322 410C316 440 330 470 346 500C340 540 324 600 316 720H616C608 600 592 540 586 500C602 470 616 440 610 410C602 372 576 352 532 348Q466 380 400 348Z"
              fill={colors.primary}
            />
            <path d="M556 356C588 368 606 388 610 410C616 440 602 470 586 500C592 540 608 600 616 720H584C578 600 566 540 566 500C580 460 580 410 556 356Z" fill={shirtShade} opacity="0.4" />
            {/* Fabric folds at the waist and under the arms. */}
            <path d="M350 470Q362 486 352 508M582 470Q570 486 580 508" stroke={shirtShade} strokeWidth="5" strokeLinecap="round" opacity="0.4" />
            {/* Neck and collar. */}
            <path d="M440 300V352Q466 382 492 352V300Z" fill={skinShade} />
            <path d="M430 346Q466 390 502 346L494 342Q466 374 438 342Z" fill={shirtShade} opacity="0.55" />

            {/* Apron. Neck loop goes behind the neck to the bib's top corners. */}
            <path d="M432 400L446 340M500 400L486 340" stroke={colors.accentDeep} strokeWidth="11" strokeLinecap="round" />
            <path d="M446 340Q466 352 486 340" stroke={colors.accentDeep} strokeWidth="9" strokeLinecap="round" opacity="0.8" />
            {/* Bib with a slight curve at the chest. */}
            <path d="M424 398Q466 392 508 398L514 484H418Z" fill={colors.accent} stroke={colors.ink} strokeWidth="5" strokeLinejoin="round" />
            <path d="M498 402L506 402L512 484H500Z" fill={colors.accentDeep} opacity="0.3" />
            {/* Skirt hangs from the waist band and sways a little (secondary motion). */}
            <g transform={`translate(466 ${WAIST_Y}) skewX(${sway}) translate(-466 ${-WAIST_Y})`}>
              <path d="M406 488C398 540 386 600 372 720H560C546 600 534 540 526 488Z" fill={colors.accent} stroke={colors.ink} strokeWidth="5" strokeLinejoin="round" />
              <path d="M514 492C522 540 534 600 546 720H560C546 600 534 540 526 488Z" fill={colors.accentDeep} opacity="0.35" />
              {/* Subtle folds falling from the band. */}
              <path d="M436 496Q432 580 422 720M496 496Q500 580 510 720" stroke={colors.accentDeep} strokeWidth="3.5" strokeLinecap="round" opacity="0.55" />
              {/* Pocket with a stitch line. */}
              <path d="M428 528H504V566Q504 578 492 578H440Q428 578 428 566Z" fill={colors.accentSoft} stroke={colors.ink} strokeWidth="4" strokeLinejoin="round" />
              <path d="M434 536H498" stroke={colors.accentDeep} strokeWidth="2.5" strokeDasharray="6 5" strokeLinecap="round" />
              <path d="M466 528V578" stroke={colors.ink} strokeWidth="3" opacity="0.6" />
            </g>
            {/* Waist band wrapping round, with the bow's tails at the side. */}
            <path d="M398 480Q466 494 534 480L536 496Q466 510 396 496Z" fill={colors.accent} stroke={colors.ink} strokeWidth="4.5" strokeLinejoin="round" />
            <g transform={`rotate(${tail} 540 490)`}>
              <path d="M538 488C552 500 556 520 552 540L542 538C544 522 540 506 532 496Z" fill={colors.accentDeep} stroke={colors.ink} strokeWidth="3.5" strokeLinejoin="round" />
              <path d="M540 490C560 496 570 510 572 526L562 528C558 514 550 504 536 498Z" fill={colors.accent} stroke={colors.ink} strokeWidth="3.5" strokeLinejoin="round" />
            </g>
          </g>

          {/* Head. */}
          <g transform={`translate(0 ${headY}) rotate(${headTilt} ${NECK.x} ${NECK.y})`}>
            <circle cx="470" cy="132" r="38" fill={colors.ink} />
            <path d="M378 252C368 160 420 132 466 132C522 132 566 164 556 254C560 290 548 312 538 322H394C384 304 376 284 378 252Z" fill={colors.ink} />
            <ellipse cx="390" cy="252" rx="14" ry="20" fill={skinShade} />
            <ellipse cx="542" cy="252" rx="14" ry="20" fill={skinShade} />
            <ellipse cx="466" cy="240" rx="78" ry="90" fill={skin} />
            <path d="M400 290Q466 352 532 290Q522 326 466 330Q410 326 400 290Z" fill={skinShade} opacity="0.35" />
            <path d="M386 226C376 150 440 124 474 130C524 136 556 172 548 228C516 220 490 200 476 172C460 204 424 222 386 226Z" fill={colors.ink} />
            <path d="M470 140C496 142 520 152 534 172" stroke="#3A4156" strokeWidth="5" strokeLinecap="round" />
            <path d={`M420 ${226 - joy * 6 + worry * 4}Q436 ${218 - joy * 8 - worry * 2} 452 ${225 - joy * 6 - worry * 9}`} stroke={colors.ink} strokeWidth="5" strokeLinecap="round" />
            <path d={`M482 ${225 - joy * 6 - worry * 9}Q498 ${218 - joy * 8 - worry * 2} 514 ${226 - joy * 6 + worry * 4}`} stroke={colors.ink} strokeWidth="5" strokeLinecap="round" />
            {[436, 498].map((cx) =>
              happy > 0.5 && eye > 0.6 ? (
                <path key={cx} d={`M${cx - 10} 254Q${cx} 242 ${cx + 10} 254`} stroke={colors.ink} strokeWidth="5" strokeLinecap="round" />
              ) : (
                <g key={cx}>
                  <ellipse cx={cx + gx} cy={250 + gy} rx="7.5" ry={Math.max(1.2, 10 * eye * (1 - happy * 0.35))} fill={colors.ink} />
                  {eye > 0.6 && <circle cx={cx + 2.5 + gx} cy={246 + gy} r="2.4" fill={colors.paperLight} />}
                </g>
              ),
            )}
            {(pose.lids ?? 0) > 0.02 &&
              [436, 498].map((cx) => {
                const l = (pose.lids ?? 0) * eye;
                const edge = 238 + 13 * l;
                return (
                  <g key={`lid-${cx}`}>
                    <path d={`M${cx - 12} 236H${cx + 12}V${edge}Q${cx} ${edge + 3} ${cx - 12} ${edge}Z`} fill={skin} />
                    <path d={`M${cx - 11} ${edge}Q${cx} ${edge + 3} ${cx + 11} ${edge}`} stroke={colors.ink} strokeWidth="4.5" strokeLinecap="round" />
                  </g>
                );
              })}
            <ellipse cx="420" cy="282" rx="17" ry="10" fill={blush} opacity={0.35 + joy * 0.25} />
            <ellipse cx="514" cy="282" rx="17" ry="10" fill={blush} opacity={0.35 + joy * 0.25} />
            <path d="M468 258Q476 274 462 278" stroke={skinDeep} strokeWidth="4" strokeLinecap="round" />
            {frown > 0.5 ? (
              <path d={`M${448} ${300}Q466 ${300 - 10 * frown} ${484} ${300}`} stroke={mouthDark} strokeWidth="6.5" strokeLinecap="round" />
            ) : (
              <path d={`M${466 - mw} ${top}Q466 ${top + 6} ${466 + mw} ${top}Q466 ${low + 4} ${466 - mw} ${top}Z`} fill={mouthDark} stroke={colors.ink} strokeWidth="3.5" strokeLinejoin="round" />
            )}
            {joy > 0.4 && <ellipse cx="466" cy={low - 5} rx={9 + joy * 5} ry={3 + joy * 3} fill={tongue} />}
            {joy > 0.55 && <path d={`M${466 - mw + 6} ${top + 2}Q466 ${top + 8} ${466 + mw - 6} ${top + 2}`} stroke={colors.paperLight} strokeWidth="5" strokeLinecap="round" />}
          </g>

          {/* Arms on top of the torso; the left (screen) arm sits a touch further back. */}
          <ArmShape shoulder={SHOULDER_L} arm={left} open={pose.open[0]} front={pose.front[0]} far mirror />
          {holding && holding({ x: rWrist.x, y: rWrist.y, angle: right[1] + right[2] })}
          <ArmShape shoulder={shoulderR} arm={right} open={pose.open[1]} front={pose.front[1]} pointer={pose.pointer} />
          {phoneWeight > 0.05 && (
            <g transform={`translate(${rWrist.x} ${rWrist.y}) rotate(-12) scale(${phoneWeight})`}>
              <rect x="-34" y="-74" width="68" height="120" rx="12" fill={colors.ink} />
              <rect x="-27" y="-64" width="54" height="96" rx="7" fill={colors.paperLight} />
              <rect x="-18" y="-50" width="36" height="8" rx="4" fill={colors.primary} />
              <rect x="-18" y="-34" width="26" height="6" rx="3" fill={colors.accent} />
              <ellipse cx="2" cy="18" rx="24" ry="20" fill={skin} />
              <path d="M-14 6Q2 0 18 6" stroke={skinShade} strokeWidth="3" strokeLinecap="round" />
            </g>
          )}
        </g>
      </g>
      {withCounter && (
        <>
          <rect x="122" y="524" width="145" height="97" rx="8" fill={colors.paper} stroke={colors.ink} strokeWidth="5" />
          <path d="M194 524V564M169 564H216" stroke={colors.ink} strokeWidth="5" />
          <rect x="82" y="611" width="745" height="35" rx="17" fill={colors.ink} />
          <path d="M113 646H797L771 782H136Z" fill={colors.accent} />
          <path d="M148 672H753M162 694H740" stroke={colors.accentDeep} strokeWidth="3" />
        </>
      )}
    </svg>
  );
};
