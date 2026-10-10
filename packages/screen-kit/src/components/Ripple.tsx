import React from 'react';
import { Easing, interpolate } from 'remotion';
import { DEFAULT_THEME } from '../theme';

// Click ripple: filled flash + two expanding rings in the accent colour. frame is relative to the click.
export const Ripple: React.FC<{ x: number; y: number; frame: number; color?: string; radius?: number }> = ({ x, y, frame, color = DEFAULT_THEME.accent, radius = 56 }) => {
  if (frame < 0 || frame > 30) return null;
  const ring = (delay: number, w: number) => {
    if (frame < delay) return null;
    const t = interpolate(frame - delay, [0, 20], [0, 1], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
    return <circle r={8 + t * radius} fill="none" stroke={color} strokeWidth={w * (1 - t * 0.6)} opacity={0.9 * (1 - t)} />;
  };
  const dot = interpolate(frame, [0, 3, 12], [0, 0.3, 0], { extrapolateRight: 'clamp' });
  const dotR = interpolate(frame, [0, 12], [10, 22], { extrapolateRight: 'clamp' });
  return (
    <svg style={{ position: 'absolute', left: x - 100, top: y - 100, width: 200, height: 200, overflow: 'visible' }} viewBox="-100 -100 200 200">
      <circle r={dotR} fill={color} opacity={dot} />
      {ring(0, 4)}
      {ring(6, 2.5)}
    </svg>
  );
};
