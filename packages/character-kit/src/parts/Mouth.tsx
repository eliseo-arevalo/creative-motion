import { useId } from "react";
import { clamp } from "../math";
import type { MouthShape, Palette } from "../types";

/**
 * Parametric mouth at (0,0): corners from `smile`, opening from the viseme / expression.
 * Closed → a lip line (U when smiling, ∩ when not); open → a dark shape with teeth/tongue clipped in.
 */
export const Mouth: React.FC<{ shape: MouthShape; smile: number; c: Palette; scale?: number }> = ({ shape, smile, c, scale = 1 }) => {
  const id = useId();
  const sm = clamp(smile, -1, 1);
  const W = 21 * (1 + 0.32 * shape.wide) * (1 - 0.45 * shape.round) + Math.max(0, sm) * 4;
  const cy = -sm * 7;
  const o = shape.open * 26;
  const k = 0.42 + shape.round * 0.5;

  if (o < 2) {
    // Closed: the line's middle sits below the corners when smiling (U), above when sad (∩).
    const mid = cy + 2.5 + (sm >= 0 ? 6.5 : 10) * sm;
    const w = 5 + shape.pressed * 2.2;
    return (
      <g transform={`scale(${scale})`}>
        <path d={`M${-W} ${cy}C${-W * 0.5} ${mid} ${W * 0.5} ${mid} ${W} ${cy}`} stroke={c.mouth} strokeWidth={w} strokeLinecap="round" fill="none" />
        {/* Lower-lip shadow; pressed lips get a little bulge line. */}
        <path d={`M${-W * 0.35} ${mid + 8}Q0 ${mid + 11} ${W * 0.35} ${mid + 8}`} stroke={c.skinShade} strokeWidth={3} strokeLinecap="round" fill="none" opacity={0.45 + shape.pressed * 0.3} />
        {sm > 0.5 && (
          <>
            <path d={`M${-W - 4} ${cy + 2}q-3 -3 -2 -7`} stroke={c.skinShade} strokeWidth={2.5} strokeLinecap="round" fill="none" opacity={0.6} />
            <path d={`M${W + 4} ${cy + 2}q3 -3 2 -7`} stroke={c.skinShade} strokeWidth={2.5} strokeLinecap="round" fill="none" opacity={0.6} />
          </>
        )}
      </g>
    );
  }

  // Frowning open mouth: corners drop, the upper lip arches (∩) and the lower lip flattens.
  const fr = Math.max(0, -sm);
  const uy = cy * 0.35 - o * 0.16 - Math.max(0, sm) * 2 - fr * (8 + cy * 0.65);
  const ly = cy * 0.2 + o * (1.15 - fr * 0.35) + Math.max(0, sm) * 7;
  const d = `M${-W} ${cy}C${-W * k} ${uy} ${W * k} ${uy} ${W} ${cy}C${W * k} ${ly} ${-W * k} ${ly} ${-W} ${cy}Z`;
  const top = Math.min(uy, cy) + (uy - cy) * 0.15;
  return (
    <g transform={`scale(${scale})`}>
      <defs>
        <clipPath id={id}>
          <path d={d} />
        </clipPath>
      </defs>
      <path d={d} fill={c.mouth} />
      <g clipPath={`url(#${id})`}>
        {shape.teeth > 0.05 && <rect x={-W} y={top - 6} width={W * 2} height={6 + 7 * shape.teeth + shape.bite * 3} rx={3} fill={c.teeth} />}
        {shape.tongue > 0.05 && (
          <ellipse cx={0} cy={shape.tongue > 0.8 ? (uy + ly) * 0.42 : ly * 0.86} rx={W * 0.6} ry={Math.max(4, o * 0.36)} fill={c.tongue} />
        )}
        {shape.bite > 0.05 && <path d={`M${-W} ${ly}Q0 ${ly - 9 * shape.bite} ${W} ${ly}V${ly + 10}H${-W}Z`} fill={c.mouth} opacity={0.7} />}
      </g>
      <path d={d} stroke={c.ink} strokeWidth={3.2} strokeLinejoin="round" fill="none" />
      <path d={`M${-W * 0.35} ${ly + 8}Q0 ${ly + 11} ${W * 0.35} ${ly + 8}`} stroke={c.skinShade} strokeWidth={3} strokeLinecap="round" fill="none" opacity={0.45} />
    </g>
  );
};
