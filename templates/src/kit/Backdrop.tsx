import { useCurrentFrame } from "remotion";
import { Parallax } from "./Camera";
import { drift } from "./motion";

const Star: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <path d="M50 0L60 34L85 15L66 40L100 50L66 60L85 85L60 66L50 100L40 66L15 85L34 60L0 50L34 40L15 15L40 34Z" fill={color} />
  </svg>
);

export type BackdropShape = {
  kind: "blob" | "ring" | "star" | "dots";
  x: number;
  y: number;
  size: number;
  color: string;
  depth?: number;
  spin?: number;
};

/** Decorative layer: shapes sit at different parallax depths and breathe slowly. */
export const Backdrop: React.FC<{ shapes: BackdropShape[] }> = ({ shapes }) => {
  const frame = useCurrentFrame();
  return (
    <>
      {shapes.map((s, i) => {
        const bob = drift(frame + i * 17, 110 + i * 13, 10);
        const rot = (s.spin ?? 0) * frame;
        return (
          <Parallax key={i} depth={s.depth ?? 0.4}>
            <div
              style={{
                position: "absolute",
                left: s.x - s.size / 2,
                top: s.y - s.size / 2 + bob,
                width: s.size,
                height: s.size,
                transform: `rotate(${rot}deg)`,
              }}
            >
              {s.kind === "blob" && <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: s.color }} />}
              {s.kind === "ring" && (
                <div style={{ width: "100%", height: "100%", borderRadius: "50%", border: `6px solid ${s.color}`, boxSizing: "border-box" }} />
              )}
              {s.kind === "star" && <Star size={s.size} color={s.color} />}
              {s.kind === "dots" && (
                <svg width={s.size} height={s.size} viewBox="0 0 100 100">
                  {Array.from({ length: 16 }, (_, k) => (
                    <circle key={k} cx={12 + (k % 4) * 25} cy={12 + Math.floor(k / 4) * 25} r={4} fill={s.color} />
                  ))}
                </svg>
              )}
            </div>
          </Parallax>
        );
      })}
    </>
  );
};

