import { createContext, useContext, type CSSProperties, type ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";

export type CameraKey = { at: number; x?: number; y?: number; scale?: number; rotate?: number };

type CameraState = { x: number; y: number; scale: number; rotate: number };
const CameraContext = createContext<CameraState>({ x: 0, y: 0, scale: 1, rotate: 0 });

const EASE = Easing.bezier(0.45, 0, 0.25, 1);

const sample = (keys: CameraKey[], frame: number, prop: keyof Omit<CameraKey, "at">, fallback: number) => {
  if (keys.length === 1) return keys[0][prop] ?? fallback;
  return interpolate(
    frame,
    keys.map((k) => k.at),
    keys.map((k) => k[prop] ?? fallback),
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE },
  );
};

/**
 * Eased virtual camera. Children rendered inside <Parallax depth> move with the
 * camera scaled by depth (0 = fixed, 1 = full camera move), giving layered depth.
 */
export const Camera: React.FC<{ keys: CameraKey[]; children: ReactNode }> = ({ keys, children }) => {
  const frame = useCurrentFrame();
  const state = {
    x: sample(keys, frame, "x", 0),
    y: sample(keys, frame, "y", 0),
    scale: sample(keys, frame, "scale", 1),
    rotate: sample(keys, frame, "rotate", 0),
  };
  return <CameraContext.Provider value={state}>{children}</CameraContext.Provider>;
};

export const Parallax: React.FC<{ depth?: number; children: ReactNode; style?: CSSProperties }> = ({
  depth = 1,
  children,
  style,
}) => {
  const cam = useContext(CameraContext);
  const scale = 1 + (cam.scale - 1) * depth;
  return (
    <AbsoluteFill
      style={{
        transform: `translate(${cam.x * depth}px, ${cam.y * depth}px) scale(${scale}) rotate(${cam.rotate * depth}deg)`,
        transformOrigin: "50% 50%",
        ...style,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
