import React from 'react';
import { Easing, interpolate } from 'remotion';
import type { Rect } from '../types';

// Accent frame on the element being clicked/hovered (always the cursor's own target).
// frame is relative to the click: appears `lead` frames before (cursor arrival), holds `hold` frames
// after the click, then retracts (shrinks onto the element while fading).
export const ClickFrame: React.FC<{ rect: Rect; frame: number; color: string; scale?: number; hold?: number; lead?: number; fill?: boolean }> = ({ rect, frame, color, scale = 1, hold = 20, lead = 8, fill = false }) => {
  const end = hold + 10;
  if (frame < -lead || frame > end) return null;
  const ease = Easing.bezier(0.2, 0, 0, 1);
  const pIn = interpolate(frame, [-lead, -lead + 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
  const pOut = interpolate(frame, [hold, end], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
  const press = interpolate(frame, [-2, 0, 6], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const pad = (14 - 9 * pIn - 3 * pOut + 2 * press) * scale;
  const op = pIn * (1 - pOut);
  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
      <rect x={rect.x - pad} y={rect.y - pad} width={rect.width + 2 * pad} height={rect.height + 2 * pad} rx={8 * scale}
        fill={fill ? color : 'none'} fillOpacity={fill ? 0.07 + 0.08 * press : 0} stroke={color} strokeWidth={3 * scale} opacity={op} />
    </svg>
  );
};
