import { useCurrentFrame, useVideoConfig } from "remotion";
import { colors, display, fonts } from "../tokens";
import { springIn } from "./motion";

/**
 * Running count ("1 venta sin anotar… 3… 7…"): a big number disc that pops on every step plus
 * a label that pluralises. `steps` = local frames at which the count goes up (count = steps passed).
 * A red tint creeps in as the count grows. Labels may contain "\n" for two lines. Plain px box at (x, y).
 */
export const TallyBadge: React.FC<{ steps: number[]; x: number; y: number; singular: string; plural: string; size?: number; warnFrom?: number }> = ({ steps, x, y, singular, plural, size = 170, warnFrom = 5 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = steps.filter((s) => frame >= s).length;
  if (n === 0) return null;
  const last = steps[n - 1];
  const pop = springIn(frame, last, fps, 14);
  const enter = springIn(frame, steps[0], fps, 18);
  const hot = n >= warnFrom;
  const wobble = Math.sin(frame / 3) * (hot ? 2.5 : 1);
  return (
    <div style={{ position: "absolute", left: x, top: y, display: "flex", alignItems: "center", gap: 26, transform: `scale(${0.6 + enter * 0.4}) rotate(${-3 + wobble}deg)`, transformOrigin: "0 50%" }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          background: hot ? "#C94A3A" : colors.accent,
          border: `6px solid ${colors.ink}`,
          boxShadow: `8px 9px 0 ${colors.ink}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...display,
          fontWeight: 600,
          fontSize: size * 0.68,
          color: hot ? colors.paperLight : colors.ink,
          transform: `scale(${1.25 - pop * 0.25})`,
          flexShrink: 0,
        }}
      >
        <span style={{ marginTop: -size * 0.06 }}>{n}</span>
      </div>
      <div style={{ fontFamily: fonts.sans, fontWeight: 700, fontSize: 64, lineHeight: 1.02, color: colors.ink, background: colors.surface, padding: "12px 24px 16px", borderRadius: 22, border: `5px solid ${colors.ink}`, whiteSpace: "pre-line" }}>
        {n === 1 ? singular : plural}
      </div>
    </div>
  );
};
