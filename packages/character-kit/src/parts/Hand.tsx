import type { ReactNode } from "react";
import { clamp01, lerp } from "../math";
import type { HandShape, Palette } from "../types";
import { handRoll } from "../roll";
export { FACE_ROLL, NATIVE_ROLL, handRoll } from "../roll";

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
  /* Handshake: edge-on, thumb on top (+x), fingers forward and wrapping round under the partner's hand. */
  shake: {
    palm: [12, -12, 15, 42, 2],
    fingers: [
      f([[-7, 38], [-12, 52], [-21, 56]], 9.5, 0, 1),
      f([[-4, 41], [-8, 59], [-20, 64]], 10.5, 0, 1),
      f([[0, 42], [-3, 64], [-16, 72]], 11, 0, 1),
      f([[5, 41], [6, 64], [-6, 76]], 11, 1, 1),
    ],
    thumb: f([[11, 8], [19, 26], [20, 46]], 12.5, 1, 1),
    slot: [0, 46],
    crease: 0,
    knuckles: 0.4,
  },
};

const ease = (t: number) => t * t * (3 - 2 * t);

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

type V = [number, number];
const lv = (a: V, b: V, t: number): V => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
/** Cubic Bézier from t0 to 1 (de Casteljau split). */
const tail = (p0: V, p1: V, p2: V, p3: V, t0: number): [V, V, V, V] => {
  const a = lv(p0, p1, t0), b = lv(p1, p2, t0), c = lv(p2, p3, t0);
  const d = lv(a, b, t0), e = lv(b, c, t0);
  return [lv(d, e, t0), e, c, p3];
};
const bez3 = (p0: V, p1: V, p2: V, p3: V, t: number): V => {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
};

/** Hand-space y where the wrist bridge hands over to the palm's outline. */
export const WRIST_JOIN = 16;
/** Default forearm width at the wrist (px) for a hand `size`, when the arm does not say. */
export const defaultWristWidth = (size: number) => size * 0.32;

/**
 * Wrist geometry for a hand model drawn with horizontal scale `sx` (roll / mirror) and a forearm of
 * width `wristW` (hand units, i.e. px / (size / 82)). The palm's top is pinched to the forearm's
 * width and a skin "bridge" — never scaled by the roll — runs from the forearm's full width at the
 * pivot to the palm's edges at `WRIST_JOIN`, where the palm outline starts. So the wrist is one
 * continuous shape (no knob, no gap, no step) and turning the hand never thins the forearm's end.
 */
export const wristJoint = (palm: HandModel["palm"], sx: number, wristW: number) => {
  const [tw0, bl, br, by] = palm;
  const a = Math.max(Math.abs(sx), 0.05);
  const fh = wristW / 2;
  // Palm top no wider than the forearm (in the drawing's own units).
  const tw = Math.min(tw0, fh / a);
  const curve = (sg: 1 | -1, bx: number): [V, V, V, V] => [[sg * tw, 0], [sg * (tw + 3), by * 0.3], [bx + sg, by * 0.7], [bx, by]];
  const L = curve(-1, bl);
  const R = curve(1, br);
  const tAt = (cv: [V, V, V, V], y: number) => {
    let lo = 0, hi = 1;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      if (bez3(...cv, mid)[1] < y) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  };
  const tL = tAt(L, WRIST_JOIN);
  const tR = tAt(R, WRIST_JOIN);
  const sideL = tail(...L, tL);
  const sideR = tail(...R, tR);
  // Join points in the bridge's (un-rolled) frame.
  const jl = sideL[0][0] * sx;
  const jr = sideR[0][0] * sx;
  const lo = Math.min(jl, jr);
  const hi = Math.max(jl, jr);
  const y = WRIST_JOIN;
  const bridge = `M${-fh} -2L${fh} -2L${fh} 0C${fh} ${y * 0.5} ${hi} ${y * 0.5} ${hi} ${y + 1}L${lo} ${y + 1}C${lo} ${y * 0.5} ${-fh} ${y * 0.5} ${-fh} 0Z`;
  /** Silhouette half-widths (left, right) of the bridge along y ∈ [0, WRIST_JOIN] (bridge frame). */
  const bridgeAt = (t: number) => {
    const r = bez3([fh, 0], [fh, y * 0.5], [hi, y * 0.5], [hi, y], t);
    const l = bez3([-fh, 0], [-fh, y * 0.5], [lo, y * 0.5], [lo, y], t);
    return { y: r[1], left: l[0], right: r[0] };
  };
  return { tw, fh, sideL, sideR, bridge, join: { lo, hi }, bridgeAt, palmTopHalf: tw * a };
};

const HandBody: React.FC<{ m: HandModel; c: Palette; slot?: ReactNode; slotBehind?: boolean; slotMirror?: boolean; sx: number; wristW: number }> = ({
  m,
  c,
  slot,
  slotBehind,
  slotMirror,
  sx,
  wristW,
}) => {
  // A turned-over (or mirrored) hand is drawn mirrored; the held object is not (only narrowed), so
  // props that keep themselves upright with `worldAngle` stay correct. They pick their face from `view`.
  const slotT = `translate(${m.slot[0]} ${m.slot[1]})${slotMirror ? " scale(-1 1)" : ""}`;
  const [, bl, br, by, qb] = m.palm;
  const j = wristJoint(m.palm, sx, wristW);
  const tw = j.tw;
  const cv = (q: [V, V, V, V]) => `M${q[0][0]} ${q[0][1]}C${q[1][0]} ${q[1][1]} ${q[2][0]} ${q[2][1]} ${q[3][0]} ${q[3][1]}`;
  const side = cv(j.sideL) + cv(j.sideR);
  const palm = `M${-tw} 0C${-tw - 3} ${by * 0.3} ${bl - 1} ${by * 0.7} ${bl} ${by}Q${(bl + br) / 2} ${by + qb} ${br} ${by}C${br + 1} ${by * 0.7} ${tw + 3} ${by * 0.3} ${tw} 0Z`;
  const back = [...m.fingers, m.thumb].filter((x) => x.z < 0.5);
  const front = m.fingers.filter((x) => x.z >= 0.5);
  return (
    <>
      {slot && slotBehind && <g transform={slotT}>{slot}</g>}
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
      {slot && !slotBehind && <g transform={slotT}>{slot}</g>}
      {front.map((x, i) => (
        <Finger key={`f${i}`} m={x} c={c} />
      ))}
      {m.thumb.z >= 0.5 && <Finger m={m.thumb} c={c} />}
    </>
  );
};

const GRIPS: HandShape[] = ["hold", "pinch"];

/** The other face of the hand: creases ↔ knuckle marks, nails appear on (or leave) the straight fingers. */
const turnOver = (m: HandModel): HandModel => ({
  ...m,
  crease: m.knuckles * 0.8,
  knuckles: m.crease,
  fingers: m.fingers.map((x) => (x.z < 0.5 ? { ...x, nail: 1 - clamp01(x.nail) } : x)) as HandModel["fingers"],
});

/**
 * A hand. `from` + `mix` morph between two shapes (0 = from, 1 = shape); the timeline fills these in
 * during transitions. `slot` (a held object) shows while the dominant shape is a grip (hold / pinch).
 * `roll` (degrees, 0 palm … 180 back) turns the hand over through its edge; unset = the drawing as is.
 * When the hand is turned over a held object goes behind the palm. `mirror` (0…1) draws it mirrored
 * (thumb on the other side). `wristW` = the forearm's width at the wrist in px, so the wrist joins it
 * seamlessly (default: about a third of `size`).
 */
export const Hand: React.FC<{
  shape: HandShape;
  from?: HandShape;
  mix?: number;
  c: Palette;
  size: number;
  slot?: ReactNode;
  roll?: number;
  mirror?: number;
  wristW?: number;
}> = ({ shape, from, mix = 1, c, size, slot, roll, mirror, wristW }) => {
  const s = size / 82;
  const t = clamp01(mix);
  const m0 = from && from !== shape && t < 1 ? morphHand(HAND_MODELS[from], HAND_MODELS[shape], ease(t)) : HAND_MODELS[shape];
  const dominant = from && t < 0.5 ? from : shape;
  const r = handRoll(shape, from, mix, roll, mirror);
  const m1 = r.flipped ? turnOver(m0) : m0;
  // Mirrored back view (a point across the body, palm to the chest): the thumb lies on the palm
  // side, behind the hand — only the knuckles show.
  const m = (mirror ?? 0) >= 0.5 && !r.flipped && m1.thumb.z >= 0.5 ? { ...m1, thumb: { ...m1.thumb, z: 0 } } : m1;
  const ww = (wristW ?? defaultWristWidth(size)) / s;
  const j = wristJoint(m.palm, r.sx, ww);
  const body = (
    <HandBody m={m} c={c} slot={GRIPS.includes(dominant) ? slot : undefined} slotBehind={r.flipped} slotMirror={r.sx < 0} sx={r.sx} wristW={ww} />
  );
  return (
    <g transform={`scale(${s})`}>
      {/* Wrist bridge: forearm width → palm edges, never narrowed by the roll. */}
      <path d={j.bridge} fill={c.skin} />
      {r.sx === 1 ? body : <g transform={`scale(${r.sx.toFixed(4)} 1)`}>{body}</g>}
    </g>
  );
};
