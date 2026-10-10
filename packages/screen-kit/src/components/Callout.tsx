import React from 'react';
import { Easing, interpolate } from 'remotion';
import type { Rect, Side } from '../types';
import { DEFAULT_THEME } from '../theme';

// Box around a target + leader line + label pill. Reveals with a stroke draw and a mask wipe (no fades);
// optional wipe-out at the end (`out`). `inFrames`/`outFrames` come from the pacing preset.
export const Callout: React.FC<{ rect: Rect; frame: number; duration: number; label: string; side?: Side; lead?: number; ink?: string; font?: string; scale?: number; inFrames?: number; outFrames?: number; out?: boolean; inkText?: string }> = ({ rect, frame, duration, label, side = 'below', lead = 46, ink = DEFAULT_THEME.accent, font = DEFAULT_THEME.font, inkText = '#ffffff', scale = 1, inFrames = 26, outFrames = 14, out = true }) => {
  if (frame < 0 || frame > duration) return null;
  const ease = Easing.bezier(0.2, 0, 0, 1);
  const a = inFrames;
  const cl = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const, easing: ease };
  const pBox = interpolate(frame, [0, a * 0.6], [0, 1], cl);
  const pLine = interpolate(frame, [a * 0.3, a * 0.75], [0, 1], cl);
  const pLabel = interpolate(frame, [a * 0.6, a], [0, 1], cl);
  const pOut = out ? interpolate(frame, [duration - outFrames, duration], [0, 1], cl) : 0;
  const perim = 2 * (rect.width + rect.height);
  const L = lead * scale;
  const horiz = side === 'left' || side === 'right';
  const sx = side === 'right' ? 1 : side === 'left' ? -1 : 0;
  const sy = side === 'below' ? 1 : side === 'above' ? -1 : 0;
  const ax = side === 'right' ? rect.x + rect.width : side === 'left' ? rect.x : rect.x + rect.width / 2;
  const ay = side === 'below' ? rect.y + rect.height : side === 'above' ? rect.y : rect.y + rect.height / 2;
  const ex = ax + sx * L * pLine, ey = ay + sy * L * pLine;
  const tipX = ax + sx * L, tipY = ay + sy * L;
  const fs = 19 * scale;
  const gap = 8 * scale;
  const labelPos: React.CSSProperties = horiz
    ? { left: side === 'right' ? tipX + gap : undefined, right: side === 'left' ? `calc(100% - ${tipX - gap}px)` : undefined, top: tipY, transform: 'translateY(-50%)' }
    : { left: tipX, top: side === 'below' ? tipY + gap : undefined, bottom: side === 'above' ? `calc(100% - ${tipY - gap}px)` : undefined, transform: 'translateX(-50%)' };
  return (
    <div style={{ position: 'absolute', inset: 0, clipPath: `inset(0 0 0 ${pOut * 100}%)` }}>
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
        <rect x={rect.x} y={rect.y} width={rect.width} height={rect.height} rx={8 * scale} fill="none" stroke={ink} strokeWidth={3 * scale} strokeDasharray={perim} strokeDashoffset={perim * (1 - pBox)} />
        <line x1={ax} y1={ay} x2={ex} y2={ey} stroke={ink} strokeWidth={2 * scale} />
        <circle cx={tipX} cy={tipY} r={3 * scale * pLine} fill={ink} />
      </svg>
      <div style={{
        position: 'absolute', ...labelPos, clipPath: side === 'left' ? `inset(0 0 0 ${(1 - pLabel) * 100}%)` : `inset(0 ${(1 - pLabel) * 100}% 0 0)`,
        background: ink, color: inkText, fontFamily: font, fontWeight: 500, fontSize: fs, lineHeight: 1,
        padding: `${0.55 * fs}px ${0.8 * fs}px`, borderRadius: 8 * scale, whiteSpace: 'nowrap', letterSpacing: '-0.01em',
      }}>{label}</div>
    </div>
  );
};
