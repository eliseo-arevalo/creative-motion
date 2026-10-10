import React from 'react';
import { Easing, interpolate } from 'remotion';
import type { Rect } from '../types';

// Soft spotlight: dims everything except rect (mask), drawn in screen space.
export const Highlight: React.FC<{ rect: Rect; frame: number; duration: number; dim?: number; radius?: number }> = ({ rect, frame, duration, dim = 0.18, radius = 10 }) => {
  if (frame < 0 || frame > duration) return null;
  const p = interpolate(frame, [0, 12, duration - 12, duration], [0, 1, 1, 0], { easing: Easing.bezier(0.2, 0, 0, 1) });
  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <defs><mask id="hl"><rect width="100%" height="100%" fill="#fff" /><rect x={rect.x} y={rect.y} width={rect.width} height={rect.height} rx={radius} fill="#000" /></mask></defs>
      <rect width="100%" height="100%" fill={`rgba(16,16,14,${dim * p})`} mask="url(#hl)" />
    </svg>
  );
};
