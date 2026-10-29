import type { CSSProperties, ReactNode } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { brand, colors, fonts } from "../../tokens";
import { ease, springIn } from "../motion";

// Extra app colors (the example app theme) that the brand tokens don't carry.
export const app = {
  neu: "#C94A3A",
  neuSoft: "#F5D9D2",
  surface: colors.surface,
  surfaceAlt: colors.paperDeep,
};

export const SCREEN_W = 524;

export type TxType = "sale" | "debt" | "expense";
const TYPES: { kind: TxType; label: string; color: string }[] = [
  { kind: "sale", label: "Venta", color: colors.primary },
  { kind: "debt", label: "Fiar", color: colors.accentDeep },
  { kind: "expense", label: "Gasto", color: app.neu },
];

export const typeColor = (kind: TxType) => TYPES.find((t) => t.kind === kind)!.color;

/** Top bar like the app: business + "Hoy". */
export const AppBar: React.FC<{ title?: string; right?: ReactNode }> = ({ title = "Mi negocio", right }) => (
  <div
    style={{
      height: 76,
      padding: "0 32px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: colors.primary, color: colors.paper, fontFamily: fonts.display, fontSize: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>{brand.name[0]}</div>
      <span style={{ fontSize: 26, fontWeight: 600 }}>{title}</span>
    </div>
    {right ?? <span style={{ fontSize: 22, color: colors.inkSoft, fontFamily: fonts.mono }}>HOY</span>}
  </div>
);

/** Venta · Fiar · Gasto segmented control; the active pill slides between options. */
export const TypeToggle: React.FC<{ active: TxType; switchAt?: number; from?: TxType }> = ({ active, switchAt, from }) => {
  const frame = useCurrentFrame();
  const idx = (k: TxType) => TYPES.findIndex((t) => t.kind === k);
  const p = switchAt === undefined || from === undefined ? 1 : ease(frame, switchAt, 12);
  const pos = interpolate(p, [0, 1], [idx(from ?? active), idx(active)]);
  const cur = p < 0.5 && from ? from : active;
  const w = (SCREEN_W - 64 - 12) / 3;
  return (
    <div style={{ margin: "6px 32px 0", height: 70, borderRadius: 35, background: app.surfaceAlt, position: "relative", padding: 6, boxSizing: "border-box" }}>
      <div style={{ position: "absolute", top: 6, left: 6 + pos * w, width: w, height: 58, borderRadius: 29, background: colors.surface, boxShadow: "0 2px 0 rgba(30,42,36,0.12)" }} />
      <div style={{ position: "relative", display: "flex", height: "100%" }}>
        {TYPES.map((t) => (
          <div key={t.kind} style={{ width: w, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 25, fontWeight: 600, color: t.kind === cur ? t.color : colors.inkSoft }}>
            {t.label}
          </div>
        ))}
      </div>
    </div>
  );
};

export const Card: React.FC<{ children: ReactNode; style?: CSSProperties }> = ({ children, style }) => (
  <div style={{ background: colors.surface, borderRadius: 26, padding: 22, boxShadow: "0 3px 0 rgba(30,42,36,0.08)", ...style }}>{children}</div>
);

/** Row that slides in from the right when `at` is reached. */
export const SlideRow: React.FC<{ at: number; children: ReactNode; style?: CSSProperties; height?: number }> = ({ at, children, style, height = 62 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = springIn(frame, at, fps, 20);
  const grow = ease(frame, at, 10);
  return (
    <div style={{ height: height * grow, overflow: "hidden" }}>
      <div style={{ height, display: "flex", alignItems: "center", justifyContent: "space-between", transform: `translateX(${(1 - p) * 120}%)`, ...style }}>{children}</div>
    </div>
  );
};

/** Primary button with a press dip at `pressAt` and an optional done state. */
export const Button: React.FC<{
  label: string;
  doneLabel?: string;
  pressAt?: number;
  color?: string;
  doneColor?: string;
  style?: CSSProperties;
}> = ({ label, doneLabel, pressAt, color = colors.primary, doneColor = colors.primaryDeep, style }) => {
  const frame = useCurrentFrame();
  const press = pressAt === undefined ? 0 : interpolate(frame - pressAt, [-4, 0, 6, 12], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const done = pressAt !== undefined && doneLabel && frame >= pressAt + 6;
  return (
    <div
      style={{
        height: 88,
        borderRadius: 44,
        background: done ? doneColor : color,
        color: colors.paper,
        fontSize: 30,
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        transform: `scale(${1 - press * 0.05})`,
        ...style,
      }}
    >
      {done ? doneLabel : label}
    </div>
  );
};

export const Chip: React.FC<{ children: ReactNode; active?: boolean; color?: string; style?: CSSProperties }> = ({ children, active, color = colors.primary, style }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "10px 20px",
      borderRadius: 24,
      fontSize: 24,
      fontWeight: 600,
      background: active ? color : app.surfaceAlt,
      color: active ? colors.paper : colors.inkSoft,
      ...style,
    }}
  >
    {children}
  </span>
);

export const Label: React.FC<{ children: ReactNode; style?: CSSProperties }> = ({ children, style }) => (
  <div style={{ fontFamily: fonts.mono, fontSize: 19, letterSpacing: "0.08em", textTransform: "uppercase", color: colors.inkMuted, ...style }}>{children}</div>
);

/** Small pop-in toast confirming an action. */
export const Toast: React.FC<{ at: number; children: ReactNode; color?: string; style?: CSSProperties }> = ({ at, children, color = colors.primary, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < at) return null;
  const p = springIn(frame, at, fps, 22);
  return (
    <div
      style={{
        position: "absolute",
        left: 28,
        right: 28,
        padding: "18px 24px",
        borderRadius: 22,
        background: colors.ink,
        color: colors.paper,
        fontSize: 25,
        display: "flex",
        alignItems: "center",
        gap: 14,
        transform: `translateY(${(1 - p) * 60}px) scale(${0.9 + p * 0.1})`,
        ...style,
      }}
    >
      <span style={{ width: 36, height: 36, borderRadius: 18, background: color, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="22" height="22" viewBox="0 0 80 80" fill="none"><path d="M15 40L33 58L66 23" stroke={colors.paper} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
      {children}
    </div>
  );
};

/** Little avatar disc used in client lists. */
export const Initial: React.FC<{ name: string; color?: string; size?: number }> = ({ name, color = colors.primarySoft, size = 54 }) => (
  <span style={{ width: size, height: size, borderRadius: size / 2, background: color, display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: size * 0.42, color: colors.ink, flexShrink: 0 }}>
    {name[0]}
  </span>
);
