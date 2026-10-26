import { footOf, footPoint, toScreen, type LegSolve } from "../legs";
import type { BottomSpec, Palette, Proportions, ShoesSpec } from "../types";
import { capsule } from "./Limbs";

type P = { x: number; y: number };

/** Convex hull (monotone chain), counter-clockwise. */
export const hull = (pts: P[]): P[] => {
  const s = [...pts].sort((a, b) => a.x - b.x || a.y - b.y);
  if (s.length < 3) return s;
  const cross = (o: P, a: P, b: P) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lo: P[] = [];
  for (const p of s) {
    while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop();
    lo.push(p);
  }
  const up: P[] = [];
  for (let i = s.length - 1; i >= 0; i--) {
    const p = s[i];
    while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop();
    up.push(p);
  }
  return [...lo.slice(0, -1), ...up.slice(0, -1)];
};

/** Smooth closed path through hull points (quadratic midpoints → rounded corners). */
const roundPath = (pts: P[]) => {
  if (pts.length < 3) return "";
  const n = pts.length;
  const mid = (a: P, b: P) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const f = (p: P) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  let d = `M${f(mid(pts[n - 1], pts[0]))}`;
  for (let i = 0; i < n; i++) d += `Q${f(pts[i])} ${f(mid(pts[i], pts[(i + 1) % n]))}`;
  return d + "Z";
};

/** Foot outline ring in foot space (a lateral, b forward from the ankle): rounded heel, wide ball, rounded toe. */
const ring = (p: Proportions, k: number, inset = 1) => {
  const f = footOf(p);
  const pts: { a: number; b: number }[] = [];
  const N = 20;
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    const c = Math.cos(t);
    // b from heel (−f.heel) to toe (f.toe); half width widest at the ball.
    const b = c > 0 ? c * f.toe * k : c * f.heel * k;
    const wf = b > f.ball * 0.7 ? 1 - ((b - f.ball * 0.7) / (f.toe - f.ball * 0.7)) ** 2 * 0.25 : b < 0 ? 0.78 : 0.88 + (b / (f.ball * 0.7)) * 0.12;
    pts.push({ a: Math.sin(t) * (f.width / 2) * wf * inset, b: b + (k < 1 ? f.toe * (1 - k) * 0.25 : 0) });
  }
  return pts;
};

/** A shoe: sole band and upper, as the outline of the foot seen from the camera (any yaw / pitch). */
export const Shoe: React.FC<{ p: Proportions; leg: LegSolve; shoes: ShoesSpec; c: Palette }> = ({ p, leg, shoes, c }) => {
  const f = footOf(p);
  const { ankle, pitch, yaw } = leg.foot;
  const at = (a: number, b: number, h: number) => toScreen(p, footPoint(p, ankle, pitch, yaw, a, b, h));
  const sole = ring(p, 1).map((q) => at(q.a, q.b, 0));
  const soleTop = ring(p, 1).map((q) => at(q.a, q.b, 7));
  const upper = ring(p, 0.9, 0.86).map((q) => at(q.a, q.b, q.b > f.ball ? f.h * 0.55 : f.h * 0.92));
  const w2 = p.legWidth[2];
  const collar = Array.from({ length: 10 }, (_, i) => {
    const t = (i / 10) * Math.PI * 2;
    return at(Math.sin(t) * (w2 / 2 + 3), Math.cos(t) * (w2 / 2 + 2) - 2, f.h + 6);
  });
  const all = hull([...soleTop, ...upper, ...collar]);
  const solePath = roundPath(hull([...sole, ...soleTop]));
  const toe = at(0, f.toe * 0.62, f.h * 0.5);
  // v7: the welt line where the upper meets the sole, on the side that faces the camera (it reads as
  // a shoe, not a blob, from the front), and a toe cap that catches the light.
  const ring1 = ring(p, 1);
  const sy = Math.sin((yaw * Math.PI) / 180);
  const cy = Math.cos((yaw * Math.PI) / 180);
  const N = ring1.length;
  const faces = ring1.map((_, i) => {
    const t = (i / N) * Math.PI * 2;
    return -Math.sin(t) * sy + Math.cos(t) * cy > 0.05;
  });
  const startI = faces.findIndex((v, i) => v && !faces[(i - 1 + N) % N]);
  const welt: P[] = [];
  if (startI >= 0) for (let k = 0; k < N && faces[(startI + k) % N]; k++) welt.push(soleTop[(startI + k) % N]);
  const cap = at(0, f.toe * 0.55, f.h * 0.62);
  const front = Math.max(0, cy);
  return (
    <g>
      <path d={solePath} fill={shoes.sole ?? c.ink} />
      <path d={roundPath(all)} fill={shoes.color} />
      {welt.length > 2 && <path d={`M${welt.map((q) => `${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join("L")}`} stroke="#fff" strokeOpacity={0.2} strokeWidth={2.2} fill="none" strokeLinecap="round" />}
      <ellipse cx={cap.x} cy={cap.y} rx={f.width * (0.14 + 0.14 * front)} ry={f.width * (0.08 + 0.04 * front)} fill="#fff" opacity={0.08 + 0.06 * front} />
      <ellipse cx={toe.x - 3} cy={toe.y - 2} rx={f.width * 0.14} ry={f.width * 0.08} fill="#fff" opacity={0.18} />
    </g>
  );
};

const segment = (a: P, b: P) => ({ len: Math.hypot(b.x - a.x, b.y - a.y), ang: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI - 90 });

/**
 * One leg in canvas space from the IK solve: thigh, shin (calf bulge on bare legs), socks, pants with
 * a knee crease when it bends, then the shoe.
 */
export const LegView: React.FC<{ leg: LegSolve; side: 1 | -1; p: Proportions; c: Palette; bottom: BottomSpec; shoes: ShoesSpec }> = ({ leg, side, p, c, bottom, shoes }) => {
  const [w0, w1, w2] = p.legWidth;
  const pants = bottom.kind === "pants" ? 1 : bottom.kind === "shorts" ? 0.55 : 0;
  const t = segment(leg.hip, leg.knee);
  const s = segment(leg.knee, leg.ankle);
  // Where the calf is (behind the shin, away from the knee's direction on screen).
  const back = -Math.sign(leg.kneeDir.x || side) * 1;
  const bendK = Math.min(1, leg.bend / 60);
  return (
    <g>
      <g transform={`translate(${leg.hip.x} ${leg.hip.y}) rotate(${t.ang})`}>
        <path d={capsule(t.len, w0, w1)} fill={c.skin} />
        {pants > 0 && <path d={capsule(t.len * Math.min(1, pants * 1.6), w0 + 14, w1 + 12)} fill={bottom.color} />}
      </g>
      <g transform={`translate(${leg.knee.x} ${leg.knee.y}) rotate(${s.ang})`}>
        <path d={capsule(s.len, w1, w2)} fill={c.skin} />
        {pants < 1 && <ellipse cx={back * w1 * 0.12} cy={s.len * 0.3} rx={w1 * 0.5} ry={s.len * 0.22} fill={c.skin} />}
        {shoes.socks && <path d={`M${-w2 / 2 - 1} ${s.len - 34}H${w2 / 2 + 1}V${s.len}H${-w2 / 2 - 1}Z`} fill={shoes.socks} />}
        {pants >= 1 && (
          <>
            <path d={capsule(Math.max(0, s.len - 4), w1 + 12, w2 + 16)} fill={bottom.color} />
            <path d={`M${(side * w1) / 2} 10L${(side * (w2 + 4)) / 2} ${s.len - 10}`} stroke={bottom.shade} strokeWidth={6} strokeLinecap="round" opacity={0.5} />
          </>
        )}
      </g>
      {pants >= 1 && bendK > 0.12 && (
        <g transform={`translate(${leg.knee.x} ${leg.knee.y}) rotate(${(t.ang + s.ang) / 2})`}>
          <path d={`M${-w1 * 0.35} -6Q0 ${4 + 6 * bendK} ${w1 * 0.35} -6`} stroke={bottom.shade} strokeWidth={4} strokeLinecap="round" fill="none" opacity={0.55 * bendK} />
        </g>
      )}
      <Shoe p={p} leg={leg} shoes={shoes} c={c} />
    </g>
  );
};
