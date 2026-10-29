import type { CSSProperties, ReactNode } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../tokens";
import { handFont } from "./handwriting";
import { drift, springIn } from "./motion";

export type PaperKind = "sticky" | "torn" | "receipt" | "phone";

/**
 * Loose paper (sticky note, torn scrap, receipt or a phone's notes app) that flies in from
 * `from` with a spin, lands at (x, y) and keeps fluttering a little. Handwritten lines.
 * `strikeAt` draws a scribble over the last line ("tachón").
 */
export const PaperNote: React.FC<{
  kind?: PaperKind;
  lines: readonly string[];
  x: number;
  y: number;
  at: number;
  rotate?: number;
  from?: { x: number; y: number };
  width?: number;
  fontSize?: number;
  strikeAt?: number;
  style?: CSSProperties;
}> = ({ kind = "sticky", lines, x, y, at, rotate = -6, from = { x: 0, y: -500 }, width = 300, fontSize = 52, strikeAt, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < at) return null;
  const p = springIn(frame, at, fps, 20);
  const flutter = drift(frame + x, 46, 2.2);
  const bg = { sticky: "#F6E27A", torn: colors.paperLight, receipt: colors.surface, phone: colors.surface }[kind];
  const strike = strikeAt === undefined ? 0 : Math.min(1, Math.max(0, (frame - strikeAt) / 8));
  const body: ReactNode = (
    <div style={{ fontFamily: handFont, fontWeight: 700, fontSize, lineHeight: 1.05, color: kind === "phone" ? colors.ink : "#2B3A8C" }}>
      {lines.map((l, i) => (
        <div key={i} style={{ position: "relative", whiteSpace: "nowrap" }}>
          {l}
          {i === lines.length - 1 && strike > 0 && (
            <svg style={{ position: "absolute", left: -6, top: "8%", width: "110%", height: "84%", overflow: "visible" }} viewBox="0 0 100 40" preserveAspectRatio="none">
              <path d="M2 22C14 8 22 34 36 18S58 6 66 24 88 30 98 12" stroke="#C94A3A" strokeWidth="5" strokeLinecap="round" fill="none" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - strike} vectorEffect="non-scaling-stroke" />
            </svg>
          )}
        </div>
      ))}
    </div>
  );
  const shape: CSSProperties =
    kind === "torn"
      ? { clipPath: "polygon(0 4%, 9% 0, 22% 5%, 37% 1%, 52% 5%, 68% 0, 83% 4%, 100% 1%, 100% 100%, 0 100%)", padding: "30px 26px 22px" }
      : kind === "receipt"
        ? { clipPath: "polygon(0 0, 100% 0, 100% 94%, 92% 100%, 84% 94%, 76% 100%, 68% 94%, 60% 100%, 52% 94%, 44% 100%, 36% 94%, 28% 100%, 20% 94%, 12% 100%, 4% 94%, 0 100%)", padding: "20px 24px 36px" }
        : kind === "phone"
          ? { borderRadius: 34, border: `10px solid ${colors.ink}`, padding: "54px 24px 26px" }
          : { padding: "26px 26px", boxShadow: "inset 0 22px 0 rgba(0,0,0,0.05)" };
  return (
    <div
      style={{
        position: "absolute",
        left: x + (1 - p) * from.x,
        top: y + (1 - p) * from.y + flutter,
        width,
        transform: `rotate(${rotate + (1 - p) * 40 + flutter * 0.6}deg)`,
        filter: "drop-shadow(6px 8px 0 rgba(30,42,36,0.22))",
        ...style,
      }}
    >
      <div style={{ background: bg, boxSizing: "border-box", ...shape }}>
        {kind === "phone" && (
          <>
            <div style={{ position: "absolute", left: "50%", top: 18, width: 70, height: 14, marginLeft: -35, borderRadius: 7, background: colors.ink }} />
            <div style={{ position: "absolute", left: 34, top: 40, fontSize: 24, fontWeight: 700, color: colors.accentDeep, fontFamily: fonts.sans }}>Notas</div>
          </>
        )}
        <div style={{ marginTop: kind === "phone" ? 18 : 0 }}>{body}</div>
      </div>
    </div>
  );
};
