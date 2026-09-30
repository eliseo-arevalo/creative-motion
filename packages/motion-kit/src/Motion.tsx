import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/** Progress 0→1 with editorial ease. Brand-agnostic (no timeline imports). */
export const progress = (frame: number, start: number, duration = 24) =>
  interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.65, 0, 0.25, 1),
  });

export const pop = (frame: number, delay: number, fps: number, duration = 32) =>
  spring({
    frame: frame - delay,
    fps,
    durationInFrames: duration,
    config: { damping: 14, stiffness: 160, mass: 0.85 },
  });

/** Type moves from below a clipping window; no opacity envelope. */
export const Reveal: React.FC<{
  children: ReactNode;
  delay?: number;
  style?: CSSProperties;
}> = ({ children, delay = 0, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, delay, fps, 34);
  return (
    <div
      style={{
        overflow: "hidden",
        paddingBottom: "0.15em",
        marginBottom: "-0.15em",
        ...style,
      }}
    >
      <div
        style={{
          transform: `translateY(${(1 - p) * 125}%) rotate(${(1 - p) * 3}deg)`,
          transformOrigin: "0 100%",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export const Sticker: React.FC<{
  children: ReactNode;
  delay?: number;
  rotate?: number;
  style?: CSSProperties;
}> = ({ children, delay = 0, rotate = -4, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, delay, fps);
  return (
    <div
      style={{
        ...style,
        transform: `translateY(${(1 - p) * 100}px) rotate(${rotate + (1 - p) * 18}deg) scale(${p})`,
      }}
    >
      {children}
    </div>
  );
};

export type WipeKind = "diagonal" | "circle" | "up" | "side";

/**
 * Geometric wipe / mask. Previous scene stays intact behind the incoming fill.
 * Pass wipeFrames (default 24) — do not import brand timelines here.
 */
export const SceneWipe: React.FC<{
  kind: WipeKind;
  children: ReactNode;
  wipeFrames?: number;
}> = ({ kind, children, wipeFrames = 24 }) => {
  const frame = useCurrentFrame();
  const p = progress(frame, 0, wipeFrames);
  const edge = -24 + p * 148;
  const clipPath =
    kind === "circle"
      ? `circle(${p * 150}% at 78% 72%)`
      : kind === "up"
        ? `inset(${(1 - p) * 100}% 0 0 0)`
        : kind === "side"
          ? `inset(0 ${(1 - p) * 100}% 0 0)`
          : `polygon(0 0, ${edge + 24}% 0, ${edge}% 100%, 0 100%)`;
  return <AbsoluteFill style={{ clipPath }}>{children}</AbsoluteFill>;
};

const DEFAULT_CHECK_COLOR = "#334155";

export const Check: React.FC<{
  progress: number;
  size?: number;
  color?: string;
}> = ({ progress: p, size = 70, color = DEFAULT_CHECK_COLOR }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
    <path
      d="M15 40L33 58L66 23"
      stroke={color}
      strokeWidth="8"
      strokeLinecap="round"
      strokeLinejoin="round"
      pathLength="1"
      strokeDasharray="1"
      strokeDashoffset={1 - p}
    />
  </svg>
);
