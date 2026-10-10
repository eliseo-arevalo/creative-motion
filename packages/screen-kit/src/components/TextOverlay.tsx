import React from 'react';
import { Easing, interpolate } from 'remotion';
import { DEFAULT_THEME } from '../theme';

// Clean screen-space text (e.g. closing URL). Reveals with a left→right mask wipe, no fade.
export const TextOverlay: React.FC<{ frame: number; duration?: number; text: string; x: number; y: number; size?: number; weight?: number; font?: string; color?: string; inFrames?: number }> = ({ frame, duration, text, x, y, size = 40, weight = 500, font = DEFAULT_THEME.font, color = '#141414', inFrames = 14 }) => {
  if (frame < 0 || (duration !== undefined && frame > duration)) return null;
  const p = interpolate(frame, [0, inFrames], [0, 1], { extrapolateRight: 'clamp', easing: Easing.bezier(0.2, 0, 0, 1) });
  const rise = (1 - p) * size * 0.25;
  return (
    <div style={{ position: 'absolute', left: x, top: y + rise, transform: 'translate(-50%, -50%)', clipPath: `inset(-20% ${(1 - p) * 100}% -20% 0)`, fontFamily: font, fontWeight: weight, fontSize: size, color, letterSpacing: '-0.02em', whiteSpace: 'nowrap', lineHeight: 1 }}>{text}</div>
  );
};
