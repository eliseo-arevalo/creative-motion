import React from 'react';
import { Img, interpolate, staticFile } from 'remotion';
import type { ManifestState } from '../types';

// Stacks captured UI states (hi-DPI screenshots).
// - State change: the incoming screenshot is laid over the outgoing one for `crossfadeFrames`,
//   mirroring the app's own short CSS transition. Outgoing stays opaque underneath (no dip).
// - `playFrames`: if the state was captured with a scrollSequence (name~1..name~N-1), those frames are
//   played as a flipbook over playFrames, then the final state holds. Real rendering of every scroll step.
export const StateStack: React.FC<{ frame: number; dir: string; states: ManifestState[]; timeline: { at: number; name: string; crossfadeFrames?: number; playFrames?: number }[]; pageW: number; pageH: number; defaultCrossfade: number }> = ({ frame, dir, states, timeline, pageW, pageH, defaultCrossfade }) => {
  const byName = (n: string) => {
    const s = states.find((x) => x.name === n);
    if (!s) throw new Error(`state ${n} not captured`);
    return s;
  };
  let prev = timeline[0].name, cur = timeline[0].name, p = 1;
  for (const t of timeline.slice(1)) {
    if (frame < t.at) break;
    const seq = states.filter((s) => s.sequenceOf === t.name).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    if (t.playFrames && seq.length) {
      const k = (frame - t.at) / t.playFrames; // 0..1
      const idx = Math.floor(k * (seq.length + 1));
      prev = cur;
      cur = idx >= seq.length ? t.name : seq[Math.max(0, idx)].name;
      p = 1;
      if (idx >= seq.length) prev = cur;
      continue;
    }
    prev = cur; cur = t.name;
    p = interpolate(frame, [t.at, t.at + (t.crossfadeFrames ?? defaultCrossfade)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  }
  const style = { position: 'absolute' as const, left: 0, top: 0, width: pageW, height: pageH };
  const src = (n: string) => staticFile(`${dir}/${byName(n).file}`);
  return (
    <>
      {p < 1 && <Img src={src(prev)} style={style} />}
      <Img src={src(cur)} style={{ ...style, opacity: p }} />
    </>
  );
};
