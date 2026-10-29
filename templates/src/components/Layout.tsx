import type { ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { brand, colors, display, fonts, eyebrow } from "../tokens";
import { Reveal } from "@eliseo-arevalo/motion-kit";

/** Text wordmark (the demo brand has no logo file). Swap for an `<Img>` of the real logo in a private brand. */
export const Wordmark: React.FC<{ width?: number; light?: boolean }> = ({ width = 210, light = false }) => (
  <div style={{ width, height: width * 0.46, display: "flex", alignItems: "center", justifyContent: "center", gap: width * 0.04 }}>
    <div style={{ width: width * 0.16, height: width * 0.16, borderRadius: width * 0.05, background: colors.accent, flex: "none" }} />
    <span style={{ ...display, fontSize: width * 0.2, whiteSpace: "nowrap", color: light ? colors.paper : colors.ink }}>{brand.name}</span>
  </div>
);

export const Canvas: React.FC<{
  children: ReactNode;
  background?: string;
  dark?: boolean;
}> = ({ children, background = colors.paper, dark = false }) => (
  <AbsoluteFill
    style={{
      background,
      color: dark ? colors.paper : colors.ink,
      fontFamily: fonts.sans,
      overflow: "hidden",
    }}
  >
    {/* Quiet print registration marks, fixed geometry, no noise or flicker. */}
    <div
      style={{
        position: "absolute",
        left: 64,
        top: 72,
        width: 24,
        height: 24,
        borderLeft: `2px solid ${dark ? colors.primarySoft : colors.ink}`,
        borderTop: `2px solid ${dark ? colors.primarySoft : colors.ink}`,
      }}
    />
    <div
      style={{
        position: "absolute",
        right: 64,
        bottom: 82,
        width: 24,
        height: 24,
        borderRight: `2px solid ${dark ? colors.primarySoft : colors.ink}`,
        borderBottom: `2px solid ${dark ? colors.primarySoft : colors.ink}`,
      }}
    />
    {children}
  </AbsoluteFill>
);

export const Eyebrow: React.FC<{
  children: ReactNode;
  light?: boolean;
  delay?: number;
}> = ({ children, light = false, delay = 12 }) => (
  <div
    style={{
      ...eyebrow,
      color: light ? colors.accent : colors.primary,
      fontSize: 28,
    }}
  >
    <Reveal delay={delay}>{children}</Reveal>
  </div>
);
