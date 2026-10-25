import type { ReactNode } from "react";
import { clamp01, lerp } from "../math";
import type { HandShape, Palette } from "../types";

/**
 * Hands, drawn in hand space: wrist at (0,0), fingers toward +y, +x = the outer edge
 * (thumb / index side). Base size: 82 px long.
 *
 * Every shape is the same model (palm + 4 fingers + thumb, each finger a 3-point stroke with its
 * own width, nail and depth), so any two shapes morph into each other point by point: fingers curl
 * and open instead of popping. Fingers are separate outlined strokes (no mittens) and the wrist end
 * has no outline, so the forearm runs straight in.
 */
const OL = 2.6; // outline width (px)

type Pt = [number, number];
type FingerM = { p: [Pt, Pt, Pt]; w: number; nail: number; z: number };
export type HandModel = {
  /** wrist half-width, bottom-left x, bottom-right x, bottom y, bottom bulge */
  palm: [number, number, number, number, number];
  /** pinky, ring, middle, index (back → front). */
  fingers: [FingerM, FingerM, FingerM, FingerM];
  thumb: FingerM;
  /** Where a held object sits (hold / pinch). */
  slot: Pt;
  /** Palm creases (palm to camera) vs. knuckle marks (back of the hand). */
  crease: number;
  knuckles: number;
};

const f = (p: [Pt, Pt, Pt], w: number, nail = 0, z = 0): FingerM => ({ p, w, nail, z });
const knuckle = (i: number): FingerM => {
  const x = -16 + i * 10.6;
  return f([[x, 36], [x, 45], [x + 0.5, 51]], 10.5, 0, 1);
};
const curled = (x: number, w: number): FingerM => f([[x, 41], [x - 1, 31], [x + 2, 24]], w, 1, 1);

const OPEN_FINGERS: HandModel["fingers"] = [
  f([[-15, 42], [-19, 56], [-22, 68]], 9.5),
  f([[-5, 44], [-6, 62], [-7, 80]], 10.5),
  f([[5, 44], [6, 63], [8, 82]], 10.5),
  f([[15, 42], [18, 59], [22, 75]], 10.5),
];
const OPEN_PALM: HandModel["palm"] = [15, -21, 21, 44, 6];
const FIST_PALM: HandModel["palm"] = [15, -22, 22, 38, 0];

export const HAND_MODELS: Record<HandShape, HandModel> = {
  /* Side-on, relaxed: palm toward the body (−x), thumb on the camera side, fingers softly curled. */
  relaxed: {
    palm: [12, -14, 15, 42, 2],
    fingers: [
      f([[-8, 38], [-12, 50], [-17, 55]], 9.5),
      f([[-4, 40], [-7, 57], [-14, 65]], 10.5),
      f([[1, 41], [0, 61], [-8, 71]], 11),
      f([[7, 40], [9, 60], [1, 70]], 11, 1),
    ],
    thumb: f([[10, 6], [17, 22], [13, 38]], 12.5, 1, 1),
    slot: [0, 46],
    crease: 0,
    knuckles: 0.4,
  },
  /* Palm to camera, fingers spread (wave / celebrate). */
  open: { palm: OPEN_PALM, fingers: OPEN_FINGERS, thumb: f([[16, 12], [30, 22], [38, 36]], 12), slot: [0, 46], crease: 1, knuckles: 0 },
  /* Back of the hand, fingers together (hand on the cheek, "stop", shading the eyes). */
  flat: {
    palm: [14, -18, 18, 44, 4],
    fingers: [
      f([[-13, 42], [-14.5, 56], [-15.5, 67]], 9.5, 1),
      f([[-4.5, 44], [-5, 62], [-5.5, 77]], 10, 1),
      f([[4, 44], [4.5, 63], [5, 80]], 10, 1),
      f([[12.5, 42], [13.5, 59], [14, 74]], 10, 1),
    ],
    thumb: f([[15, 10], [23, 22], [23, 35]], 11, 1),
    slot: [0, 46],
    crease: 0,
    knuckles: 1,
  },
  /* Fist, knuckles to camera, thumb across the front. */
  fist: {
    palm: FIST_PALM,
    fingers: [knuckle(0), knuckle(1), knuckle(2), knuckle(3)],
    thumb: f([[18, 18], [12, 34], [-2, 40]], 12, 1, 1),
    slot: [0, 46],
    crease: 0,
    knuckles: 1,
  },
  /* Index straight out, the rest curled. */
  point: {
    palm: FIST_PALM,
    fingers: [knuckle(0), knuckle(1), knuckle(2), f([[15, 34], [15.5, 56], [16, 80]], 10.5, 1, 1)],
    thumb: f([[18, 16], [10, 32], [-4, 40]], 12, 1, 1),
    slot: [0, 46],
    crease: 0,
    knuckles: 1,
  },
  /* Wrapping grip: palm behind the object, fingers come round its −x edge and lie on its front,
     thumb on the +x edge. The held object is drawn centred on the slot, about 44 px wide (−x edge at the fingers). */
  hold: {
    palm: [14, -20, 20, 42, 8],
    fingers: [
      f([[-25, 53], [-36, 56], [-19, 61]], 9.5, 1, 1),
      f([[-26, 43], [-38, 46], [-18, 51]], 10.5, 1, 1),
      f([[-26, 33], [-38, 36], [-18, 41]], 10.5, 1, 1),
      f([[-25, 23], [-36, 26], [-19, 31]], 10.5, 1, 1),
    ],
    thumb: f([[14, 8], [26, 20], [19, 34]], 12, 1, 1),
    slot: [-4, 38],
    crease: 0,
    knuckles: 0,
  },
  /* Thumb and index pinch at the tip (a bill, a coin, a card); the other fingers curl. */
  pinch: {
    palm: FIST_PALM,
    fingers: [knuckle(0), knuckle(1), knuckle(2), f([[15, 36], [24, 50], [17, 60]], 10.5, 1, 1)],
    thumb: f([[18, 14], [25, 36], [19, 57]], 12, 1, 1),
    slot: [17, 60],
    crease: 0,
    knuckles: 1,
  },
  /* Counting on the fingers, palm to camera: 1, 2, 3 up, the rest folded under the thumb. */
  count1: {
    palm: OPEN_PALM,
    fingers: [curled(-15, 9.5), curled(-5, 10.5), curled(5, 10.5), f([[15, 42], [16, 61], [17, 80]], 10.5)],
    thumb: f([[16, 12], [8, 28], [-6, 32]], 12, 1, 1),
    slot: [0, 46],
    crease: 0.6,
    knuckles: 0,
  },
  count2: {
    palm: OPEN_PALM,
    fingers: [curled(-15, 9.5), curled(-5, 10.5), f([[5, 44], [7, 63], [10, 82]], 10.5), f([[15, 42], [19, 60], [24, 77]], 10.5)],
    thumb: f([[16, 12], [6, 28], [-9, 33]], 12, 1, 1),
    slot: [0, 46],
    crease: 0.6,
    knuckles: 0,
  },
  count3: {
    palm: OPEN_PALM,
    fingers: [curled(-15, 9.5), f([[-5, 44], [-5, 62], [-4, 80]], 10.5), f([[5, 44], [7, 63], [10, 82]], 10.5), f([[15, 42], [19, 60], [24, 77]], 10.5)],
    thumb: f([[16, 12], [4, 28], [-12, 36]], 12, 1, 1),
    slot: [0, 46],
    crease: 0.6,
    knuckles: 0,
  },
};

const lp = (a: Pt, b: Pt, t: number): Pt => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
const lf = (a: FingerM, b: FingerM, t: number): FingerM => ({
  p: [lp(a.p[0], b.p[0], t), lp(a.p[1], b.p[1], t), lp(a.p[2], b.p[2], t)],
  w: lerp(a.w, b.w, t),
  nail: lerp(a.nail, b.nail, t),
  z: lerp(a.z, b.z, t),
});
export const morphHand = (a: HandModel, b: HandModel, t: number): HandModel => ({
  palm: a.palm.map((v, i) => lerp(v, b.palm[i], t)) as HandModel["palm"],
  fingers: a.fingers.map((x, i) => lf(x, b.fingers[i], t)) as HandModel["fingers"],
  thumb: lf(a.thumb, b.thumb, t),
  slot: lp(a.slot, b.slot, t),
  crease: lerp(a.crease, b.crease, t),
  knuckles: lerp(a.knuckles, b.knuckles, t),
});

const Finger: React.FC<{ m: FingerM; c: Palette }> = ({ m, c }) => {
  const [a, b, e] = m.p;
  const d = `M${a[0]} ${a[1]}Q${b[0]} ${b[1]} ${e[0]} ${e[1]}`;
  const ang = Math.atan2(e[1] - b[1], e[0] - b[0]);
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  // Nail: a short flat cap just inside the tip.
  const nx = e[0] - ca * 4.5;
  const ny = e[1] - sa * 4.5;
  const hw = m.w * 0.24;
  return (
    <g>
      <path d={d} stroke={c.skinShade} strokeWidth={m.w + OL * 2} strokeLinecap="round" fill="none" />
      <path d={d} stroke={c.skin} strokeWidth={m.w} strokeLinecap="round" fill="none" />
      {m.nail > 0.05 && (
        <path d={`M${nx - sa * hw} ${ny + ca * hw}L${nx + sa * hw} ${ny - ca * hw}`} stroke={c.skinShade} strokeWidth={3.2} strokeLinecap="round" opacity={0.55 * clamp01(m.nail)} />
      )}
    </g>
  );
};

/** Covers the wrist joint with the forearm's colour so no line ever shows there. */
const Cuff: React.FC<{ c: Palette; w: number }> = ({ c, w }) => <path d="M0 -12L0 4" stroke={c.skin} strokeWidth={w} strokeLinecap="round" />;

const HandBody: React.FC<{ m: HandModel; c: Palette; slot?: ReactNode }> = ({ m, c, slot }) => {
  const [tw, bl, br, by, qb] = m.palm;
  const side = `M${-tw} 2C${-tw - 3} ${by * 0.3} ${bl - 1} ${by * 0.7} ${bl} ${by}M${tw} 2C${tw + 3} ${by * 0.3} ${br + 1} ${by * 0.7} ${br} ${by}`;
  const palm = `M${-tw} 0C${-tw - 3} ${by * 0.3} ${bl - 1} ${by * 0.7} ${bl} ${by}Q${(bl + br) / 2} ${by + qb} ${br} ${by}C${br + 1} ${by * 0.7} ${tw + 3} ${by * 0.3} ${tw} 0Z`;
  const back = [...m.fingers, m.thumb].filter((x) => x.z < 0.5);
  const front = m.fingers.filter((x) => x.z >= 0.5);
  return (
    <>
      <Cuff c={c} w={tw * 2} />
      {back.map((x, i) => (
        <Finger key={`b${i}`} m={x} c={c} />
      ))}
      <path d={palm} fill={c.skin} />
      <path d={side} stroke={c.skinShade} strokeWidth={OL} strokeLinecap="round" fill="none" />
      {m.crease > 0.05 && (
        <path d={`M${bl + 9} ${by - 14}Q${(bl + br) / 2} ${by - 20} ${br - 9} ${by - 12}M${-4} ${by * 0.32}Q4 ${by * 0.6} 2 ${by - 4}`} stroke={c.skinShade} strokeWidth={2} strokeLinecap="round" fill="none" opacity={0.5 * m.crease} />
      )}
      {m.knuckles > 0.05 && (
        <path d={`M${bl + 7} ${by - 12}Q${(bl + br) / 2} ${by - 16} ${br - 7} ${by - 12}`} stroke={c.skinShade} strokeWidth={2} strokeLinecap="round" fill="none" opacity={0.45 * m.knuckles} />
      )}
      {slot && <g transform={`translate(${m.slot[0]} ${m.slot[1]})`}>{slot}</g>}
      {front.map((x, i) => (
        <Finger key={`f${i}`} m={x} c={c} />
      ))}
      {m.thumb.z >= 0.5 && <Finger m={m.thumb} c={c} />}
    </>
  );
};

const GRIPS: HandShape[] = ["hold", "pinch"];

/**
 * A hand. `from` + `mix` morph between two shapes (0 = from, 1 = shape); the timeline fills these in
 * during transitions. `slot` (a held object) shows while the dominant shape is a grip (hold / pinch).
 */
export const Hand: React.FC<{ shape: HandShape; from?: HandShape; mix?: number; c: Palette; size: number; slot?: ReactNode }> = ({ shape, from, mix = 1, c, size, slot }) => {
  const s = size / 82;
  const t = clamp01(mix);
  const m = from && from !== shape && t < 1 ? morphHand(HAND_MODELS[from], HAND_MODELS[shape], t * t * (3 - 2 * t)) : HAND_MODELS[shape];
  const dominant = from && t < 0.5 ? from : shape;
  return (
    <g transform={`scale(${s})`}>
      <HandBody m={m} c={c} slot={GRIPS.includes(dominant) ? slot : undefined} />
    </g>
  );
};
