import { interpolate, useCurrentFrame } from "remotion";
import { colors } from "../tokens";

/**
 * Finger-tap indicator: a fingertip dot presses in, then a ring expands.
 * Pair every Tap with a tap SFX at the same frame (see sfx helpers in the promo).
 */
export const Tap: React.FC<{ x: number; y: number; at: number; color?: string }> = ({
  x,
  y,
  at,
  color = colors.accent,
}) => {
  const frame = useCurrentFrame();
  const local = frame - at;
  if (local < -8 || local > 22) return null;
  const press = interpolate(local, [-8, 0, 6, 14], [0.6, 1, 0.85, 0.6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const dot = interpolate(local, [-8, -4, 10, 16], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ring = interpolate(local, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 0, height: 0, pointerEvents: "none" }}>
      {local >= 0 && (
        <div
          style={{
            position: "absolute",
            left: -60 * (0.4 + ring),
            top: -60 * (0.4 + ring),
            width: 120 * (0.4 + ring),
            height: 120 * (0.4 + ring),
            borderRadius: "50%",
            border: `5px solid ${color}`,
            opacity: 1 - ring,
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          left: -34,
          top: -34,
          width: 68,
          height: 68,
          borderRadius: "50%",
          background: "rgba(30,42,36,0.28)",
          border: `3px solid rgba(255,255,255,0.8)`,
          transform: `scale(${press})`,
          opacity: dot,
        }}
      />
    </div>
  );
};
