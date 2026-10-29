import type { CSSProperties } from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { springIn } from "./motion";

/**
 * Word-by-word pop. No clipping window, so a still never shows half a glyph;
 * each word is either fully drawn or rising into place.
 */
export const PopWords: React.FC<{
  text: string;
  start: number;
  stagger?: number;
  style?: CSSProperties;
  highlight?: string[];
  highlightColor?: string;
}> = ({ text, start, stagger = 4, style, highlight = [], highlightColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(" ");
  return (
    <span style={{ display: "inline", ...style }}>
      {words.map((word, i) => {
        const at = start + i * stagger;
        const p = springIn(frame, at, fps, 22);
        const shown = interpolate(frame, [at, at + 5], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const bare = word.replace(/[.,¿?¡!]/g, "");
        const isHi = highlight.includes(bare);
        return (
          <span
            key={`${word}-${i}`}
            style={{
              display: "inline-block",
              whiteSpace: "pre",
              opacity: shown,
              transform: `translateY(${(1 - p) * 0.55}em) rotate(${(1 - p) * 4}deg)`,
              transformOrigin: "0 100%",
              color: isHi ? highlightColor : undefined,
            }}
          >
            {word}
            {i < words.length - 1 ? " " : ""}
          </span>
        );
      })}
    </span>
  );
};

/** Multi-line headline; each line is a PopWords run that starts after the previous. */
export const Headline: React.FC<{
  lines: readonly string[];
  start: number;
  lineGap?: number;
  style?: CSSProperties;
  highlight?: string[];
  highlightColor?: string;
}> = ({ lines, start, lineGap = 7, style, highlight, highlightColor }) => {
  let t = start;
  return (
    <div style={style}>
      {lines.map((line) => {
        const at = t;
        t += line.split(" ").length * 3 + lineGap;
        return (
          <div key={line}>
            <PopWords text={line} start={at} stagger={3} highlight={highlight} highlightColor={highlightColor} />
          </div>
        );
      })}
    </div>
  );
};
