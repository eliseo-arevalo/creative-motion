import type { CSSProperties } from "react";
import { useCurrentFrame } from "remotion";
import { ease } from "./motion";
import { formatUSD } from "./money";

/** Animated amount in cents. Tabular digits so the width never jitters. */
export const CountUp: React.FC<{
  from?: number;
  to: number;
  start: number;
  duration?: number;
  style?: CSSProperties;
  prefix?: string;
}> = ({ from = 0, to, start, duration = 24, style, prefix = "" }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, start, duration);
  const cents = Math.round(from + (to - from) * p);
  return (
    <span style={{ fontVariantNumeric: "tabular-nums", ...style }}>
      {prefix}
      {formatUSD(cents)}
    </span>
  );
};
