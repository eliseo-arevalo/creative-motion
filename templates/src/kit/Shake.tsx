import type { ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

export type ShakeKick = { at: number; amount?: number; frames?: number };

/**
 * Deterministic camera shake. Each kick decays over `frames` (default 8); `base` adds a
 * constant low jitter (chaos beats). Same frame → same offset, so renders are stable.
 */
export const Shake: React.FC<{ kicks?: ShakeKick[]; base?: number; children: ReactNode }> = ({ kicks = [], base = 0, children }) => {
  const frame = useCurrentFrame();
  const energy =
    base +
    kicks.reduce((sum, k) => {
      const t = frame - k.at;
      const len = k.frames ?? 8;
      return t < 0 || t > len ? sum : sum + (k.amount ?? 14) * (1 - t / len) ** 2;
    }, 0);
  const x = Math.sin(frame * 2.7) * 0.6 + Math.sin(frame * 5.3 + 1) * 0.4;
  const y = Math.cos(frame * 3.1 + 2) * 0.6 + Math.sin(frame * 4.7) * 0.4;
  return (
    <AbsoluteFill style={{ transform: `translate(${x * energy}px, ${y * energy}px) rotate(${x * energy * 0.03}deg)` }}>
      {children}
    </AbsoluteFill>
  );
};
