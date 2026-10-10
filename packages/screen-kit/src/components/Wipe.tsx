import React from 'react';
import { Easing, interpolate } from 'remotion';
import type { WipeDir } from '../types';

// Diagonal mask wipe: reveals `children` (incoming shot) over whatever is beneath.
export const Wipe: React.FC<{ progress: number; dir?: WipeDir; W: number; H: number; children: React.ReactNode }> = ({ progress, dir = 'left', W, H, children }) => {
  const p = Easing.bezier(0.65, 0, 0.35, 1)(Math.min(1, Math.max(0, progress)));
  const skew = 0.12;
  let poly: string;
  if (dir === 'left' || dir === 'right') {
    const s = W * skew;
    const e = interpolate(p, [0, 1], [-s, W + s]);
    poly = dir === 'left'
      ? `polygon(0 0, ${e + s}px 0, ${e}px ${H}px, 0 ${H}px)`
      : `polygon(${W - e - s}px 0, ${W}px 0, ${W}px ${H}px, ${W - e}px ${H}px)`;
  } else {
    const s = H * skew;
    const e = interpolate(p, [0, 1], [-s, H + s]);
    poly = dir === 'up'
      ? `polygon(0 ${H - e}px, ${W}px ${H - e - s}px, ${W}px ${H}px, 0 ${H}px)`
      : `polygon(0 0, ${W}px 0, ${W}px ${e}px, 0 ${e + s}px)`;
  }
  return <div style={{ position: 'absolute', inset: 0, clipPath: poly }}>{children}</div>;
};
