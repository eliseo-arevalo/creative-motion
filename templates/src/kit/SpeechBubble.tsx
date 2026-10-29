import type { CSSProperties, ReactNode } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../tokens";
import { springIn } from "./motion";

/**
 * Cut-paper speech bubble that pops in at `at` (local frame); the tail points down to the
 * speaker (`tail` = x offset in px from the bubble's left edge). Doubles as an on-screen caption
 * for a voiced line, so it reads with the sound off.
 */
export const SpeechBubble: React.FC<{ at: number; children: ReactNode; tail?: number; style?: CSSProperties; fontSize?: number }> = ({
  at,
  children,
  tail = 90,
  style,
  fontSize = 60,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < at) return null;
  const p = springIn(frame, at, fps, 20);
  return (
    <div style={{ position: "absolute", transform: `scale(${0.5 + p * 0.5}) rotate(${(1 - p) * -5}deg)`, transformOrigin: `${tail}px 120%`, opacity: Math.min(1, p * 2), ...style }}>
      <div
        style={{
          position: "relative",
          padding: "22px 36px 26px",
          borderRadius: 44,
          background: colors.surface,
          border: `5px solid ${colors.ink}`,
          boxShadow: `8px 9px 0 rgba(30,42,36,0.3)`,
          fontFamily: fonts.sans,
          fontWeight: 700,
          fontSize,
          lineHeight: 1.1,
          color: colors.ink,
          whiteSpace: "nowrap",
        }}
      >
        {children}
        <svg width="60" height="48" viewBox="0 0 60 48" style={{ position: "absolute", left: tail - 30, bottom: -43 }}>
          <path d="M6 0L18 44L46 0" fill={colors.surface} stroke={colors.ink} strokeWidth="5" strokeLinejoin="round" />
          <rect x="4" y="-6" width="46" height="8" fill={colors.surface} />
        </svg>
      </div>
    </div>
  );
};
