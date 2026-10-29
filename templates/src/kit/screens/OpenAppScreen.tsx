import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { brand, colors, fonts } from "../../tokens";
import { springIn } from "../motion";

/** App launch: splash with the brand mark popping, then it clears to the app (`doneAt`). */
export const OpenAppScreen: React.FC<{ at?: number; doneAt: number }> = ({ at = 0, doneAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = springIn(frame, at, fps, 22);
  const out = interpolate(frame, [doneAt - 6, doneAt], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (out <= 0) return null;
  return (
    <div style={{ position: "absolute", inset: -64, background: colors.primary, opacity: out, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, zIndex: 5 }}>
      <div style={{ width: 190, height: 190, borderRadius: 52, background: colors.paper, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: fonts.display, fontSize: 110, color: colors.primary, transform: `scale(${0.4 + pop * 0.6}) rotate(${(1 - pop) * -20}deg)` }}>{brand.name[0]}</div>
      <div style={{ fontFamily: fonts.display, fontSize: 64, color: colors.paper, opacity: pop, letterSpacing: "-0.03em" }}>{brand.name}</div>
    </div>
  );
};
