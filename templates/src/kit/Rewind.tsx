import type { ReactNode } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { colors, fonts } from "../tokens";
import { Easing } from "remotion";

/**
 * "Rewind" (⏪) beat: `render(t)` draws any earlier moment of the video for a source frame `t`
 * (e.g. wrap scenes in <Freeze frame={t}>), and this plays it backwards from `from` to `to` over
 * `frames`, accelerating then braking, under a VHS look: scanlines, tracking band, slight RGB
 * split, a big drawn ◀◀ glyph (centred, at `glyphY`). Local frames.
 */
export const Rewind: React.FC<{ from: number; to: number; frames: number; render: (t: number) => ReactNode; label?: string; glyphY?: number }> = ({ from, to, frames, render, label, glyphY = 410 }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, frames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.5, 0, 0.3, 1) });
  const t = Math.round(from + (to - from) * p);
  const band = ((frame * 97) % 2100) - 200;
  const split = 6 + Math.sin(frame * 1.7) * 3;
  const jitter = Math.sin(frame * 5.1) * 4;
  return (
    <AbsoluteFill style={{ background: colors.ink, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `translate(${jitter}px, 0) scale(1.02)`, filter: "saturate(0.75) contrast(1.08)" }}>
        <AbsoluteFill style={{ transform: `translateX(${split}px)`, opacity: 0.35, mixBlendMode: "screen", filter: "hue-rotate(-40deg)" }}>{render(t)}</AbsoluteFill>
        <AbsoluteFill style={{ opacity: 0.88 }}>{render(t)}</AbsoluteFill>
      </AbsoluteFill>
      {/* Scanlines + tracking band. */}
      <AbsoluteFill style={{ background: "repeating-linear-gradient(180deg, rgba(0,0,0,0.16) 0 3px, transparent 3px 7px)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: band, height: 90, background: "linear-gradient(180deg, transparent, rgba(253,249,240,0.35) 45%, rgba(253,249,240,0.1) 60%, transparent)", transform: `translateX(${jitter * 4}px)` }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: glyphY, display: "flex", justifyContent: "center", alignItems: "center", gap: 22, color: colors.paperLight, fontFamily: fonts.mono, fontWeight: 500, fontSize: 64, textShadow: "4px 4px 0 rgba(30,42,36,0.6)", opacity: Math.floor(frame / 5) % 2 ? 1 : 0.8 }}>
        <svg width="264" height="160" viewBox="0 0 132 80" style={{ filter: "drop-shadow(6px 6px 0 rgba(30,42,36,0.55))" }}>
          <path d="M64 6L6 40L64 74Z M126 6L68 40L126 74Z" fill={colors.paperLight} stroke={colors.ink} strokeWidth="5" strokeLinejoin="round" />
        </svg>
        {label}
      </div>
    </AbsoluteFill>
  );
};
