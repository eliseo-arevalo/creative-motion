import { useCurrentFrame, useVideoConfig } from "remotion";
import { colors } from "../tokens";
import { springIn } from "./motion";

const skin = "#C98B62";
const skinShade = "#A86E4A";

/**
 * A kid on the customer side of the counter (closest to camera): pops up at `at`, hops to be
 * seen over the counter and waves a coin in the raised hand. Head + shoulders; the scene lets the
 * frame edge (or the counter) cut the body. ViewBox 320×420; frames are local.
 */
export const Kid: React.FC<{ at: number; shirt?: string; cap?: string; hop?: boolean }> = ({ at, shirt = "#C9714A", cap = "#3F8C8C", hop = true }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < at - 1) return null;
  const t = frame - at;
  const up = springIn(frame, at, fps, 18);
  const bounce = hop ? Math.abs(Math.sin(t / 4.2)) * 26 : 0;
  const y = (1 - up) * 420 - bounce;
  const wave = Math.sin(t / 2.6) * 14;
  const blink = (t + 40) % 70 < 3;
  return (
    <svg width="100%" height="100%" viewBox="0 0 320 420" style={{ overflow: "visible" }}>
      <g transform={`translate(0 ${y})`}>
        {/* Raised arm with a coin. */}
        <g transform={`rotate(${-8 + wave} 230 250)`}>
          <path d="M230 250L262 140" stroke={shirt} strokeWidth="44" strokeLinecap="round" />
          <path d="M252 168L270 96" stroke={skin} strokeWidth="30" strokeLinecap="round" />
          <circle cx="272" cy="86" r="22" fill={skin} stroke={skinShade} strokeWidth="3" />
          <circle cx="286" cy="62" r="20" fill={colors.accent} stroke={colors.ink} strokeWidth="5" />
          <circle cx="286" cy="62" r="10" fill="none" stroke={colors.accentDeep} strokeWidth="3" />
        </g>
        {/* Body. */}
        <path d="M70 420C70 320 100 268 160 268C220 268 250 320 250 420Z" fill={shirt} stroke={colors.ink} strokeWidth="5" />
        <path d="M130 272Q160 300 190 272" stroke={colors.ink} strokeWidth="4" fill="none" opacity="0.5" />
        {/* Head. */}
        <ellipse cx="88" cy="190" rx="14" ry="18" fill={skinShade} />
        <ellipse cx="232" cy="190" rx="14" ry="18" fill={skinShade} />
        <ellipse cx="160" cy="186" rx="74" ry="80" fill={skin} />
        {/* Cap (peak to the side, cheeky). */}
        <path d="M86 160C86 96 124 82 160 82C200 82 236 100 236 160Z" fill={cap} stroke={colors.ink} strokeWidth="5" strokeLinejoin="round" />
        <path d="M200 150Q262 140 286 160Q250 172 204 166Z" fill={cap} stroke={colors.ink} strokeWidth="5" strokeLinejoin="round" />
        <circle cx="160" cy="84" r="8" fill={colors.ink} />
        {/* Eyes (big, eager), brows up. */}
        {[132, 188].map((cx) => (
          <g key={cx}>
            {blink ? (
              <path d={`M${cx - 10} 190H${cx + 10}`} stroke={colors.ink} strokeWidth="5" strokeLinecap="round" />
            ) : (
              <>
                <ellipse cx={cx} cy="190" rx="10" ry="13" fill={colors.ink} />
                <circle cx={cx + 3} cy="185" r="3.5" fill={colors.paperLight} />
              </>
            )}
            <path d={`M${cx - 13} 168Q${cx} 160 ${cx + 13} 166`} stroke={colors.ink} strokeWidth="5" strokeLinecap="round" />
          </g>
        ))}
        <ellipse cx="116" cy="220" rx="13" ry="8" fill="#E27F6A" opacity="0.45" />
        <ellipse cx="204" cy="220" rx="13" ry="8" fill="#E27F6A" opacity="0.45" />
        {/* Open mouth, asking. */}
        <path d={`M140 226Q160 ${252 + Math.sin(t / 3) * 4} 180 226Z`} fill="#6E2A25" stroke={colors.ink} strokeWidth="4" strokeLinejoin="round" />
      </g>
    </svg>
  );
};
