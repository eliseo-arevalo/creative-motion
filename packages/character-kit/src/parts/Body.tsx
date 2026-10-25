import { useId } from "react";
import type { ApronSpec, BottomSpec, Palette, Proportions, TopSpec } from "../types";

type P2 = [number, number];
type Seg = [P2, P2, P2]; // cubic: c1, c2, end

/** Build a symmetric closed path from the left half (start point + cubic segments, top → bottom). */
const mirrored = (start: P2, segs: Seg[], neckDip: number) => {
  const f = (p: P2) => `${p[0]} ${p[1]}`;
  const m = (p: P2): P2 => [-p[0], p[1]];
  let d = `M${f(start)}`;
  for (const [a, b, e] of segs) d += `C${f(a)} ${f(b)} ${f(e)}`;
  const last = segs[segs.length - 1][2];
  d += `L${f(m(last))}`;
  const pts: P2[] = [start, ...segs.map((s) => s[2])];
  for (let i = segs.length - 1; i >= 0; i--) {
    const [a, b] = segs[i];
    d += `C${f(m(b))} ${f(m(a))} ${f(m(pts[i]))}`;
  }
  d += `Q0 ${neckDip} ${f(start)}Z`;
  return d;
};

/** Torso silhouette in torso space (hip at 0,0): neck, rounded shoulders, waist, hips. */
export const torsoPath = (p: Proportions) => {
  const a = -p.torso;
  const S = p.shoulderHalf;
  const W = p.waistHalf;
  const H = p.hipHalf;
  const D = p.shoulderDrop;
  const N = p.neckHalf;
  const wy = -p.torso * 0.36;
  return mirrored(
    [-N - 10, a + 2],
    [
      [[-N - 34, a + 6], [-S + 34, a + D - 20], [-S + 12, a + D - 14]],
      [[-S - 4, a + D - 9], [-S - 11, a + D + 6], [-S - 9, a + D + 28]],
      [[-S - 7, a + D + 58], [-S + 2, a + D + 82], [-S + 6, a + D + 98]],
      [[-S + 10, a + D + 140], [-W - 2, wy - 52], [-W, wy]],
      [[-W + 2, wy + 40], [-H, -42], [-H, 0]],
      [[-H, 14], [-H - 1, 30], [-H - 2, 44]],
    ],
    a + 26,
  );
};

/** Shirt / blouse on the torso: silhouette, side shade, neckline, folds, optional print. */
export const Top: React.FC<{ p: Proportions; c: Palette; top: TopSpec }> = ({ p, c, top }) => {
  const id = useId();
  const d = torsoPath(p);
  const a = -p.torso;
  const S = p.shoulderHalf;
  const N = p.neckHalf;
  const wy = -p.torso * 0.36;
  return (
    <g>
      <defs>
        <clipPath id={id}>
          <path d={d} />
        </clipPath>
      </defs>
      <path d={d} fill={top.color} />
      <g clipPath={`url(#${id})`}>
        {top.pattern &&
          Array.from({ length: 9 }, (_, r) =>
            Array.from({ length: 9 }, (_, k) => (
              <circle key={`${r}-${k}`} cx={-S - 20 + k * 30 + (r % 2) * 15} cy={a + 10 + r * 34} r={4} fill={top.pattern} opacity={0.8} />
            )),
          )}
        {/* Flat side shade (light from screen left) and the head's shadow under the collar. */}
        <path d={`M${S * 0.5} ${a}C${S * 0.95} ${a + 80} ${S * 0.7} ${wy} ${S * 0.62} 60H${S + 40}V${a}Z`} fill={top.shade} opacity={0.38} />
        <ellipse cx={0} cy={a + 6} rx={N + 26} ry={20} fill={top.shade} opacity={0.4} />
        {/* Chest curve and waist folds. */}
        {p.bust > 0 && (
          <path
            d={`M${-S * 0.62} ${a + p.shoulderDrop + 92}Q${-S * 0.32} ${a + p.shoulderDrop + 112} ${-S * 0.06} ${a + p.shoulderDrop + 96}M${S * 0.06} ${a + p.shoulderDrop + 96}Q${S * 0.32} ${a + p.shoulderDrop + 112} ${S * 0.62} ${a + p.shoulderDrop + 92}`}
            stroke={top.shade}
            strokeWidth={4}
            strokeLinecap="round"
            fill="none"
            opacity={0.35 * p.bust}
          />
        )}
        <path d={`M${-p.waistHalf + 8} ${wy - 26}Q${-p.waistHalf + 18} ${wy - 6} ${-p.waistHalf + 8} ${wy + 16}M${p.waistHalf - 8} ${wy - 26}Q${p.waistHalf - 18} ${wy - 6} ${p.waistHalf - 8} ${wy + 16}`} stroke={top.shade} strokeWidth={4} strokeLinecap="round" fill="none" opacity={0.4} />
      </g>
      {/* Neckline. */}
      {top.kind === "tee" && <path d={`M${-N - 10} ${a + 3}Q0 ${a + 28} ${N + 10} ${a + 3}`} stroke={top.trim ?? top.shade} strokeWidth={6} strokeLinecap="round" fill="none" />}
      {top.kind === "blouse" && (
        <path d={`M${-N - 12} ${a + 2}L0 ${a + 46}L${N + 12} ${a + 2}`} stroke={top.trim ?? top.shade} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      )}
      {top.kind === "polo" && (
        <>
          <path d={`M${-N - 14} ${a}L-2 ${a + 34}L-4 ${a + 8}Z`} fill={top.trim ?? top.shade} />
          <path d={`M${N + 14} ${a}L2 ${a + 34}L4 ${a + 8}Z`} fill={top.trim ?? top.shade} />
          <path d={`M0 ${a + 30}V${a + 78}`} stroke={top.shade} strokeWidth={4} strokeLinecap="round" />
          <circle cx={0} cy={a + 50} r={3.5} fill={top.shade} />
          <circle cx={0} cy={a + 68} r={3.5} fill={top.shade} />
        </>
      )}
    </g>
  );
};

/** The neck (in neck space: top of the torso at 0, up = −y). Darker skin reads as the chin's shadow. */
export const Neck: React.FC<{ p: Proportions; c: Palette }> = ({ p, c }) => (
  <path d={`M${-p.neckHalf} 30V${-p.neck - 14}H${p.neckHalf}V30Z`} fill={c.skinShade} />
);

/** Skirt / pants block from the waist down, in hip space. Pants' legs are drawn by the legs. */
export const Bottom: React.FC<{ p: Proportions; bottom: BottomSpec; sway: number }> = ({ p, bottom, sway }) => {
  const wy = -p.torso * 0.36;
  const W = p.waistHalf;
  const H = p.hipHalf;
  if (bottom.kind === "skirt") {
    const len = p.thigh + 36;
    return (
      <g transform={`translate(0 ${wy}) skewX(${sway * 0.7}) translate(0 ${-wy})`}>
        <path d={`M${-W - 2} ${wy}L${W + 2} ${wy}C${H + 6} ${-30} ${H + 26} ${len * 0.5} ${H + 34} ${len}Q0 ${len + 14} ${-H - 34} ${len}C${-H - 26} ${len * 0.5} ${-H - 6} ${-30} ${-W - 2} ${wy}Z`} fill={bottom.color} />
        <path d={`M${H * 0.45} ${10}C${H * 0.7} ${len * 0.4} ${H + 10} ${len * 0.7} ${H + 26} ${len + 2}L${H + 34} ${len}C${H + 26} ${len * 0.5} ${H + 6} -30 ${W + 2} ${wy}Z`} fill={bottom.shade} opacity={0.5} />
        <path d={`M${-H * 0.3} 40Q${-H * 0.38} ${len * 0.6} ${-H * 0.5} ${len + 4}M${H * 0.15} 50Q${H * 0.2} ${len * 0.6} ${H * 0.25} ${len + 6}`} stroke={bottom.shade} strokeWidth={4} strokeLinecap="round" fill="none" opacity={0.6} />
      </g>
    );
  }
  return (
    <g>
      <path d={`M${-W - 2} ${wy}L${W + 2} ${wy}C${H + 4} -20 ${H + 6} 20 ${H + 4} 60L${-H - 4} 60C${-H - 6} 20 ${-H - 4} -20 ${-W - 2} ${wy}Z`} fill={bottom.color} />
      <path d={`M0 ${wy + 10}V56`} stroke={bottom.shade} strokeWidth={4} strokeLinecap="round" opacity={0.7} />
      <path d={`M${-W - 2} ${wy + 4}H${W + 2}`} stroke={bottom.shade} strokeWidth={8} opacity={0.6} />
    </g>
  );
};

/**
 * Apron in torso space: neck strap, bib, waist band with the bow's tails, and the skirt part,
 * which sways with the hips (secondary motion) and has a stitched pocket.
 */
export const Apron: React.FC<{ p: Proportions; apron: ApronSpec; sway: number; tail: number }> = ({ p, apron, sway, tail }) => {
  const a = -p.torso;
  const W = p.waistHalf;
  const H = p.hipHalf;
  const N = p.neckHalf;
  const wy = -p.torso * 0.36;
  const top = a + p.shoulderDrop + 36;
  const bw = p.shoulderHalf * 0.46;
  const len = p.thigh * 0.78;
  const st = { stroke: apron.outline, strokeWidth: 4.5, strokeLinejoin: "round" as const };
  return (
    <g>
      {apron.kind === "bib" && (
        <>
          <path d={`M${-bw + 8} ${top + 2}L${-N - 4} ${a + 6}M${bw - 8} ${top + 2}L${N + 4} ${a + 6}`} stroke={apron.shade} strokeWidth={11} strokeLinecap="round" />
          <path d={`M${-bw} ${top}Q0 ${top - 7} ${bw} ${top}L${W * 0.98} ${wy}L${-W * 0.98} ${wy}Z`} fill={apron.color} {...st} />
          <path d={`M${bw - 14} ${top + 2}L${bw} ${top}L${W * 0.98} ${wy}L${W * 0.8} ${wy}Z`} fill={apron.shade} opacity={0.3} />
        </>
      )}
      <g transform={`translate(0 ${wy}) skewX(${sway}) translate(0 ${-wy})`}>
        <path d={`M${-W * 0.88} ${wy + 4}C${-W * 0.92} ${wy + 80} ${-H * 0.84} ${len * 0.5} ${-H * 0.9} ${len}Q0 ${len + 10} ${H * 0.9} ${len}C${H * 0.84} ${len * 0.5} ${W * 0.92} ${wy + 80} ${W * 0.88} ${wy + 4}Z`} fill={apron.color} {...st} />
        <path d={`M${W * 0.88 - 14} ${wy + 8}C${W * 0.92 - 10} ${wy + 90} ${H * 0.84 - 12} ${len * 0.5} ${H * 0.9 - 14} ${len + 3}L${H * 0.9} ${len}C${H * 0.84} ${len * 0.5} ${W * 0.92} ${wy + 80} ${W * 0.88} ${wy + 4}Z`} fill={apron.shade} opacity={0.32} />
        <path d={`M${-W * 0.45} ${wy + 14}Q${-W * 0.5} ${len * 0.5} ${-W * 0.62} ${len + 4}M${W * 0.4} ${wy + 14}Q${W * 0.46} ${len * 0.5} ${W * 0.58} ${len + 5}`} stroke={apron.shade} strokeWidth={3.5} strokeLinecap="round" fill="none" opacity={0.55} />
        {apron.pocket && (
          <>
            <path d={`M${-W * 0.52} ${wy + 46}H${W * 0.52}V${wy + 94}Q${W * 0.52} ${wy + 106} ${W * 0.4} ${wy + 106}H${-W * 0.4}Q${-W * 0.52} ${wy + 106} ${-W * 0.52} ${wy + 94}Z`} fill={apron.pocket} {...st} strokeWidth={4} />
            <path d={`M${-W * 0.45} ${wy + 55}H${W * 0.45}`} stroke={apron.shade} strokeWidth={2.5} strokeDasharray="6 5" strokeLinecap="round" />
            <path d={`M0 ${wy + 46}V${wy + 106}`} stroke={apron.outline} strokeWidth={3} opacity={0.6} />
          </>
        )}
      </g>
      {/* Waist band wrapping round; the bow's tails swing behind the hip's motion. */}
      <path d={`M${-W - 8} ${wy - 10}Q0 ${wy + 2} ${W + 8} ${wy - 10}L${W + 9} ${wy + 8}Q0 ${wy + 20} ${-W - 9} ${wy + 8}Z`} fill={apron.color} {...st} />
      <g transform={`rotate(${tail} ${W + 6} ${wy})`}>
        <path d={`M${W + 4} ${wy - 2}C${W + 18} ${wy + 10} ${W + 22} ${wy + 30} ${W + 18} ${wy + 52}L${W + 7} ${wy + 50}C${W + 10} ${wy + 32} ${W + 6} ${wy + 16} ${W - 2} ${wy + 6}Z`} fill={apron.shade} {...st} strokeWidth={3.5} />
        <path d={`M${W + 6} ${wy}C${W + 26} ${wy + 6} ${W + 36} ${wy + 20} ${W + 38} ${wy + 36}L${W + 28} ${wy + 38}C${W + 24} ${wy + 24} ${W + 16} ${wy + 14} ${W + 2} ${wy + 8}Z`} fill={apron.color} {...st} strokeWidth={3.5} />
      </g>
    </g>
  );
};
