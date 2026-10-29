import { interpolate, useCurrentFrame } from "remotion";
import { colors } from "../tokens";
import { handFont } from "./handwriting";
import { ease } from "./motion";

export type NotebookLine = {
  text: string;
  /** Crossed out (tachón) from this local frame on. */
  strikeAt?: number;
  /** Scribbled over completely (a messy blot) instead of a single strike. */
  blot?: boolean;
  color?: string;
};

const INK = "#2B3A8C";
const RED = "#C94A3A";

const Page: React.FC<{ lines: NotebookLine[]; frame: number; fontSize: number; side: "left" | "right" }> = ({ lines, frame, fontSize, side }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      background: `repeating-linear-gradient(180deg, transparent 0 ${fontSize * 1.16 - 3}px, rgba(43,58,140,0.2) ${fontSize * 1.16 - 3}px ${fontSize * 1.16}px), ${colors.paperLight}`,
      backgroundPosition: `0 ${fontSize * 0.62}px`,
      borderRadius: side === "left" ? "18px 4px 4px 18px" : "4px 18px 18px 4px",
      padding: `${fontSize * 0.5}px ${fontSize * 0.5}px 0 ${fontSize * (side === "left" ? 0.7 : 0.9)}px`,
      boxSizing: "border-box",
      overflow: "hidden",
    }}
  >
    {side === "left" && <div style={{ position: "absolute", left: fontSize * 0.45, top: 0, bottom: 0, width: 3, background: "rgba(201,74,58,0.45)" }} />}
    {lines.map((l, i) => {
      const s = l.strikeAt === undefined ? 0 : Math.min(1, Math.max(0, (frame - l.strikeAt) / (l.blot ? 10 : 6)));
      return (
        <div key={i} style={{ position: "relative", fontFamily: handFont, fontWeight: 700, fontSize, lineHeight: 1.16, color: l.color ?? INK, whiteSpace: "nowrap", transform: `rotate(${((i * 37) % 5) - 2}deg)` }}>
          {l.text}
          {s > 0 && (
            <svg style={{ position: "absolute", left: -8, top: 0, width: "calc(100% + 16px)", height: "100%", overflow: "visible" }} viewBox="0 0 100 30" preserveAspectRatio="none">
              {l.blot ? (
                <path d="M2 14C10 2 16 28 24 10S36 26 44 8 56 28 64 10 76 26 84 8 96 24 98 14M4 20C18 8 30 26 46 14S74 4 96 18" stroke={INK} strokeWidth="7" strokeLinecap="round" fill="none" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - s} vectorEffect="non-scaling-stroke" />
              ) : (
                <path d="M0 17C30 12 60 20 100 13" stroke={RED} strokeWidth="5" strokeLinecap="round" fill="none" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - s} vectorEffect="non-scaling-stroke" />
              )}
            </svg>
          )}
        </div>
      );
    })}
  </div>
);

/**
 * The old sales notebook ("el cuaderno"): open spiral spread with handwritten entries and
 * tachones; `closeAt` flips the right page over and lands the closed cover (with a little bounce).
 * Plain px box `width × height` (open spread). Frames are local to the parent sequence.
 */
export const Notebook: React.FC<{
  width?: number;
  height?: number;
  left: NotebookLine[];
  right: NotebookLine[];
  fontSize?: number;
  closeAt?: number;
  cover?: string;
  coverLabel?: string;
}> = ({ width = 760, height = 520, left, right, fontSize = 44, closeAt, cover = "#B24C3A", coverLabel = "Ventas" }) => {
  const frame = useCurrentFrame();
  const flip = closeAt === undefined ? 0 : ease(frame, closeAt, 14);
  const settle = closeAt === undefined ? 0 : interpolate(frame - closeAt, [12, 16, 22], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const half = width / 2;
  const angle = -180 * flip;
  return (
    <div style={{ position: "absolute", width, height, perspective: 1800 }}>
      {/* Back cover edge under the spread. */}
      <div style={{ position: "absolute", left: -12, top: -10, width: flip > 0.5 ? half + 24 : width + 24, height: height + 22, borderRadius: 24, background: cover, boxShadow: "10px 12px 0 rgba(30,42,36,0.25)" }} />
      <div style={{ position: "absolute", left: 0, top: 0, width: half, height }}>
        <Page lines={left} frame={frame} fontSize={fontSize} side="left" />
      </div>
      <div
          style={{
            position: "absolute",
            left: half,
            top: 0,
            width: half,
            height,
            transformOrigin: "0 50%",
            transformStyle: "preserve-3d",
            transform: `rotateY(${angle}deg) translateY(${-settle * 6}px)`,
          }}
        >
          <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden" }}>
            <Page lines={right} frame={frame} fontSize={fontSize} side="right" />
          </div>
          {/* Back of the turning sheet = the front cover once closed. */}
          <div
            style={{
              position: "absolute",
              inset: -10,
              borderRadius: 22,
              background: cover,
              transform: "rotateY(180deg)",
              backfaceVisibility: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ background: colors.paperLight, borderRadius: 10, padding: "10px 30px", fontFamily: handFont, fontWeight: 700, fontSize: fontSize * 1.1, color: INK, transform: "rotate(-3deg)" }}>{coverLabel}</div>
          </div>
        </div>
      {/* Spiral rings along the spine. */}
      {Array.from({ length: Math.floor(height / 46) }, (_, i) => (
        <div key={i} style={{ position: "absolute", left: half - 14, top: 22 + i * 46, width: 28, height: 16, borderRadius: 8, border: `5px solid ${colors.ink}`, boxSizing: "border-box", background: "transparent", opacity: flip > 0.5 ? 0.9 : 1 }} />
      ))}
    </div>
  );
};
