import React from 'react';
import { Easing, interpolate } from 'remotion';
import { DEFAULT_THEME } from '../theme';

const GLYPH: Record<string, string> = { ArrowDown: '↓', ArrowUp: '↑', ArrowLeft: '←', ArrowRight: '→', Enter: '⏎', Escape: 'Esc', Tab: '⇥', ' ': 'Space' };

// Discreet keycap bottom-centre. Wipes in a few frames before a run of presses, depresses on each
// press (with accent edge), wipes out after the last one.
export const Keycap: React.FC<{ frame: number; keys: { at: number; key: string }[]; W: number; H: number; accent: string; font?: string }> = ({ frame, keys, W, H, accent, font = DEFAULT_THEME.font }) => {
  if (!keys.length) return null;
  const sorted = [...keys].sort((a, b) => a.at - b.at);
  // group runs of presses less than 40 frames apart
  const runs: { at: number; key: string }[][] = [];
  for (const k of sorted) { const r = runs[runs.length - 1]; if (r && k.at - r[r.length - 1].at < 40) r.push(k); else runs.push([k]); }
  const run = runs.find((r) => frame >= r[0].at - 12 && frame <= r[r.length - 1].at + 24);
  if (!run) return null;
  const cur = [...run].reverse().find((k) => frame >= k.at - 6) ?? run[0];
  const press = interpolate(frame - cur.at, [-2, 0, 5], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const ease = Easing.bezier(0.2, 0, 0, 1);
  const pin = interpolate(frame, [run[0].at - 12, run[0].at - 4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
  const pout = interpolate(frame, [run[run.length - 1].at + 16, run[run.length - 1].at + 24], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
  const size = 64;
  const g = GLYPH[cur.key] ?? cur.key;
  return (
    <div style={{ position: 'absolute', left: W / 2 - size / 2, top: H - 112, width: size, height: size + 6, clipPath: `inset(${pout * 100}% 0 ${(1 - pin) * 100}% 0)` }}>
      <div style={{
        position: 'absolute', left: 0, top: press * 4, width: size, height: size, borderRadius: 12,
        background: '#ffffff', border: `1.5px solid ${press > 0.05 ? accent : '#cfcfcf'}`,
        boxShadow: `0 ${6 - press * 4}px 0 ${press > 0.05 ? accent : '#bdbdbd'}, 0 10px 24px rgba(0,0,0,${0.14 - press * 0.06})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font, fontWeight: 500, fontSize: g.length > 1 ? 20 : 32, color: '#171717',
      }}>{g}</div>
    </div>
  );
};
