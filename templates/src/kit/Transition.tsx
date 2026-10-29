import type { ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "./motion";

export type TransitionKind = "up" | "side" | "diagonal" | "circle" | "pill";

/**
 * Opaque geometric wipe with a coloured leading band (no fades).
 * The incoming scene is clipped; the band rides the edge and is gone when p = 1.
 */
export const Transition: React.FC<{
  kind: TransitionKind;
  frames?: number;
  band?: string;
  origin?: { x: number; y: number };
  children: ReactNode;
}> = ({ kind, frames = 20, band, origin = { x: 50, y: 60 }, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, 0, frames);
  if (p >= 1) return <AbsoluteFill>{children}</AbsoluteFill>;
  const B = 7; // band width in %
  const clipFor = (q: number) => {
    switch (kind) {
      case "up":
        return `inset(${(1 - q) * 100}% 0 0 0)`;
      case "side":
        return `inset(0 ${(1 - q) * 100}% 0 0)`;
      case "circle":
        return `circle(${q * 150}% at ${origin.x}% ${origin.y}%)`;
      case "pill":
        return `inset(${(1 - q) * origin.y}% ${(1 - q) * (100 - origin.x)}% ${(1 - q) * (100 - origin.y)}% ${(1 - q) * origin.x}% round ${(1 - q) * 120 + 20}px)`;
      case "diagonal":
      default: {
        const edge = -24 + q * 148;
        return `polygon(0 0, ${edge + 24}% 0, ${edge}% 100%, 0 100%)`;
      }
    }
  };
  // Band = same shape, slightly ahead of the content mask.
  const lead = Math.min(1, p + B / 100);
  return (
    <AbsoluteFill>
      {band && <AbsoluteFill style={{ clipPath: clipFor(lead), background: band }} />}
      <AbsoluteFill style={{ clipPath: clipFor(p) }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};
