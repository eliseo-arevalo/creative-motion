import type { ReactNode } from "react";
import { colors } from "../tokens";

/**
 * A customer's forearm reaching into frame from the right (sleeve + side-on hand), optionally
 * holding something (`children`, hand space: origin at the palm). The wrapper's (0,0) is where
 * the palm lands at `reach` = 1; at 0 the arm is pulled `length + 160` px to the right.
 * `flip` mirrors it to come from the left.
 */
export const ReachArm: React.FC<{ reach: number; length?: number; sleeve?: string; skin?: string; angle?: number; flip?: boolean; children?: ReactNode }> = ({
  reach,
  length = 620,
  sleeve = "#5B6FB0",
  skin = "#B97A55",
  angle = 0,
  flip = false,
  children,
}) => {
  const W = length + 160;
  const dx = (1 - reach) * W;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 0, height: 0, transform: `scaleX(${flip ? -1 : 1}) rotate(${angle}deg)` }}>
      <svg width={W} height="220" viewBox={`0 0 ${W} 220`} style={{ position: "absolute", left: -50 + dx, top: -110, overflow: "visible" }}>
        <path d={`M${W} 66L132 82Q112 110 132 138L${W} 154Z`} fill={sleeve} stroke={colors.ink} strokeWidth="5" strokeLinejoin="round" />
        <path d="M140 84Q124 110 140 136" stroke="rgba(30,42,36,0.35)" strokeWidth="5" fill="none" />
        <rect x="74" y="88" width="72" height="44" rx="22" fill={skin} />
        <path d="M90 84C64 80 32 82 16 92C6 100 8 116 20 122C38 130 66 134 90 134Z" fill={skin} stroke="#8E5A3C" strokeWidth="3" strokeLinejoin="round" />
        <path d="M80 104Q58 96 38 104" stroke="#8E5A3C" strokeWidth="12" strokeLinecap="round" />
        <path d="M80 104Q58 96 38 104" stroke={skin} strokeWidth="8" strokeLinecap="round" />
        <g transform="translate(50 110)">{children}</g>
      </svg>
    </div>
  );
};
