import type { ReactNode } from "react";
import type { ArmPose, Palette, Proportions, ShoesSpec, SleeveLength, TopSpec, BottomSpec } from "../types";
import { Hand } from "./Hand";

/** Tapered capsule along +y from 0 to len (round, same-colour ends → seamless joints). */
export const capsule = (len: number, w0: number, w1: number) => {
  const a = w0 / 2;
  const b = w1 / 2;
  return `M${-a} 0L${-b} ${len}A${b} ${b} 0 0 0 ${b} ${len}L${a} 0A${a} ${a} 0 0 0 ${-a} 0Z`;
};

const sleeveReach = (s: SleeveLength): [number, number] =>
  s === "short" ? [0.5, 0] : s === "threeQuarter" ? [1, 0.45] : s === "long" ? [1, 0.93] : [0, 0];

/**
 * One arm in shoulder space (parent already mirrored for the left side). Hierarchy:
 * upper arm → forearm → hand, each rotated by its own bone angle around a real pivot.
 */
export const Arm: React.FC<{ arm: ArmPose; p: Proportions; c: Palette; top: TopSpec; slot?: ReactNode; debug?: boolean }> = ({ arm, p, c, top, slot, debug }) => {
  const [w0, w1, w2] = p.armWidth;
  const U = p.upperArm * (arm.upper ?? 1);
  const F = p.foreArm * (arm.fore ?? 1);
  const [su, sf] = sleeveReach(top.sleeve);
  const cap = w0 / 2 + 4;
  const hemW = (w0 + (w1 - w0) * su) / 2 + 6;
  const sleeveU = su * U;
  return (
    <g transform={`rotate(${-arm.shoulder})`}>
      <path d={capsule(U, w0, w1)} fill={c.skin} />
      {su > 0 && (
        <>
          {/* Shadow the sleeve casts on the arm. */}
          {su < 1 && <path d={`M${-w1 / 2} ${sleeveU}L${w1 / 2} ${sleeveU}L${w1 / 2} ${sleeveU + 9}Q0 ${sleeveU + 13} ${-w1 / 2} ${sleeveU + 9}Z`} fill={c.skinShade} opacity={0.55} />}
          <path d={`M${-cap} 0A${cap} ${cap} 0 0 1 ${cap} 0L${hemW} ${sleeveU}Q0 ${sleeveU + 7} ${-hemW} ${sleeveU}Z`} fill={top.color} />
          <path d={`M${cap * 0.35} ${-cap * 0.6}Q${cap} ${sleeveU * 0.4} ${hemW - 3} ${sleeveU}L${hemW} ${sleeveU}L${cap} 0Q${cap * 0.9} ${-cap * 0.5} ${cap * 0.35} ${-cap * 0.6}Z`} fill={top.shade} opacity={0.5} />
          {su < 1 && <path d={`M${-hemW + 2} ${sleeveU - 4}Q0 ${sleeveU + 3} ${hemW - 2} ${sleeveU - 4}`} stroke={top.shade} strokeWidth={3} strokeLinecap="round" fill="none" opacity={0.8} />}
        </>
      )}
      <g transform={`translate(0 ${U}) rotate(${-arm.elbow})`}>
        <path d={capsule(F, w1, w2)} fill={c.skin} />
        {sf > 0 && (
          <>
            <path d={capsule(sf * F, w1 + 12, w2 + 12 + (1 - sf) * 6)} fill={top.color} />
            <path d={`M${-(w1 + 12) / 2} ${sf * F - 2}L${(w1 + 12) / 2} ${sf * F - 2}`} stroke={top.shade} strokeWidth={3} strokeLinecap="round" opacity={0.8} />
          </>
        )}
        <g transform={`translate(0 ${F}) rotate(${-arm.wrist})`}>
          <Hand shape={arm.hand} from={arm.handFrom} mix={arm.handMix} c={c} size={p.hand} slot={slot} />
          {debug && <circle r={5} fill="#E5484D" stroke="#fff" strokeWidth={2} />}
        </g>
        {debug && <circle r={6} fill="#E5484D" stroke="#fff" strokeWidth={2} />}
      </g>
      {debug && <circle r={6} fill="#E5484D" stroke="#fff" strokeWidth={2} />}
    </g>
  );
};

/** One leg in hip-joint space: thigh → shin → shoe. `bend` folds the knee (front view). */
export const Leg: React.FC<{ angle: number; bend: number; p: Proportions; c: Palette; bottom: BottomSpec; shoes: ShoesSpec }> = ({ angle, bend, p, c, bottom, shoes }) => {
  const [w0, w1, w2] = p.legWidth;
  const pants = bottom.kind === "pants" ? 1 : bottom.kind === "shorts" ? 0.55 : 0;
  return (
    <g transform={`rotate(${-angle - bend * 0.35})`}>
      <path d={capsule(p.thigh, w0, w1)} fill={c.skin} />
      {pants > 0 && <path d={capsule(p.thigh * Math.min(1, pants * 1.6), w0 + 14, w1 + 12)} fill={bottom.color} />}
      <g transform={`translate(0 ${p.thigh}) rotate(${bend * 0.7})`}>
        <path d={capsule(p.shin, w1, w2)} fill={c.skin} />
        {shoes.socks && <path d={`M${-w2 / 2 - 1} ${p.shin - 34}H${w2 / 2 + 1}V${p.shin}H${-w2 / 2 - 1}Z`} fill={shoes.socks} />}
        {pants >= 1 && (
          <>
            <path d={capsule(p.shin - 4, w1 + 12, w2 + 16)} fill={bottom.color} />
            <path d={`M${w1 / 2} 10L${w2 / 2 + 4} ${p.shin - 10}`} stroke={bottom.shade} strokeWidth={6} strokeLinecap="round" opacity={0.5} />
          </>
        )}
        <g transform={`translate(0 ${p.shin}) rotate(${-bend * 0.35 + angle})`}>
          <path d="M-17 -8C-22 12 -16 26 0 26C17 26 25 14 21 -8Z" fill={shoes.color} />
          <path d="M-18 18Q2 30 22 16" stroke={shoes.sole ?? c.ink} strokeWidth={5} strokeLinecap="round" fill="none" />
        </g>
      </g>
    </g>
  );
};
