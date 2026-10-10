import React from 'react';
import { Easing, interpolate } from 'remotion';
import type { Pt } from '../types';

export type CursorMove = { at: number; duration: number; to: Pt; arc?: number };

// Position along a list of moves; each move follows a gentle quadratic arc with ease-in-out.
export const cursorPosition = (frame: number, start: Pt, moves: CursorMove[]): Pt => {
  let from = start;
  for (const m of moves) {
    if (frame < m.at) return from;
    const t = interpolate(frame, [m.at, m.at + m.duration], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.45, 0, 0.15, 1) });
    const dx = m.to.x - from.x, dy = m.to.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    const arc = (m.arc ?? 0.12) * len;
    const c = { x: (from.x + m.to.x) / 2 + (-dy / len) * arc, y: (from.y + m.to.y) / 2 + (dx / len) * arc };
    const p = { x: (1 - t) ** 2 * from.x + 2 * (1 - t) * t * c.x + t * t * m.to.x, y: (1 - t) ** 2 * from.y + 2 * (1 - t) * t * c.y + t * t * m.to.y };
    if (t < 1) return p;
    from = m.to;
  }
  return from;
};

// macOS-like arrow, drawn in screen space; tip is at (x, y).
export const Cursor: React.FC<{ x: number; y: number; size?: number; opacity?: number; press?: number }> = ({ x, y, size = 30, opacity = 1, press = 0 }) => (
  <svg width={size} height={size * 1.5} viewBox="0 0 20 30" style={{ position: 'absolute', left: x - size * 0.11, top: y - size * 0.07, opacity, transform: `scale(${1 - press * 0.2})`, transformOrigin: '10% 7%', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.28))', overflow: 'visible' }}>
    <path d="M2.2 1.4 L2.2 22.6 L7.3 17.8 L10.6 25.4 L14.1 23.9 L10.9 16.5 L17.8 16.5 Z" fill="#111" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);
