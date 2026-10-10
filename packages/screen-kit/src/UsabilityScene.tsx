import React from 'react';
import { AbsoluteFill, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Camera } from './components/Camera';
import { StateStack } from './components/StateStack';
import { Cursor, cursorPosition } from './components/Cursor';
import { Ripple } from './components/Ripple';
import { Callout } from './components/Callout';
import { Highlight } from './components/Highlight';
import { TextOverlay } from './components/TextOverlay';
import { Wipe } from './components/Wipe';
import { ClickFrame } from './components/ClickFrame';
import { Keycap } from './components/Keycap';
import { cameraAt, getBox, rectToScreen, resolvePoint, toScreen } from './geometry';
import { pacingOf } from './pacing';
import { DEFAULT_THEME } from './theme';
import type { CursorTrack, Manifest, Props, Pt, Scene, TargetRef } from './types';

// Target of a click/hover = destination of the last cursor move that has ended by that frame.
export const eventTarget = (t: CursorTrack, at: number, defaultMove: number): Pt | TargetRef => eventInfo(t, at, defaultMove).to;
// …plus the frame the cursor arrived there (so the click frame can appear on arrival)
export const eventInfo = (t: CursorTrack, at: number, defaultMove: number): { to: Pt | TargetRef; arrivedAt: number } => {
  let to: Pt | TargetRef = t.start, arrivedAt = t.appearAt ?? 0;
  for (const mv of t.moves) { const end = mv.at + (mv.duration ?? defaultMove); if (end <= at + 1) { to = mv.to; arrivedAt = end; } }
  return { to, arrivedAt };
};
const drift = (f: number, amp: number) => ({ x: Math.sin(f * 0.071) * amp + Math.sin(f * 0.023 + 1) * amp * 0.6, y: Math.cos(f * 0.053) * amp * 0.8 });

const pad = (r: { x: number; y: number; width: number; height: number }, p: number) => ({ x: r.x - p, y: r.y - p, width: r.width + 2 * p, height: r.height + 2 * p });

// Everything the viewer sees at a given frame: camera + UI states + overlays.
// Rendered once normally, twice during a wipe (outgoing shot frozen on the frame before the cut).
const SceneLayer: React.FC<{ frame: number; scene: Scene; manifest: Manifest; sceneId: string }> = ({ frame, scene, manifest, sceneId }) => {
  const { fps, width: W, height: H } = useVideoConfig();
  const c = scene.composition;
  const tl = c.timeline;
  const pace = pacingOf(tl.pacing);
  const pageW = manifest.viewport.width, pageH = manifest.viewport.height;
  const cam = cameraAt(frame, fps, tl.camera, manifest, tl.wideScale ?? 0.9, pace.camera, tl.maxScale, pace.zone, tl.rules?.maxScaleRatio ?? 2, tl.zoneFloor ?? 1);
  const font = c.theme?.font ?? DEFAULT_THEME.font;
  const mono = c.theme?.monoFont ?? DEFAULT_THEME.monoFont;
  const ink = c.theme?.ink ?? DEFAULT_THEME.ink;
  const accent = c.theme?.accent ?? DEFAULT_THEME.accent;
  const accentInk = c.theme?.accentInk ?? DEFAULT_THEME.accentInk;
  const overlayScale = 1 + 0.35 * (cam.s - 1); // overlays grow gently with zoom (1:1 looks huge)
  const tracks: CursorTrack[] = tl.cursors ?? (tl.cursor ? [tl.cursor] : []);

  return (
    <AbsoluteFill style={{ background: c.background ?? '#efeee9' }}>
      <Camera cam={cam} pageW={pageW} pageH={pageH} outW={W} outH={H}>
        <StateStack frame={frame} dir={sceneId} states={manifest.states} timeline={tl.states} pageW={pageW} pageH={pageH} defaultCrossfade={pace.crossfade} />
      </Camera>
      {(tl.highlights ?? []).map((h, i) => (
        <Highlight key={`h${i}`} rect={rectToScreen(pad(getBox(manifest, h.target), h.padding ?? 8), cam, W, H, pageW)} frame={frame - h.at} duration={h.duration} />
      ))}
      {(tl.callouts ?? []).map((co, i) => (
        <Callout key={`c${i}`} rect={rectToScreen(pad(getBox(manifest, co.target), co.padding ?? 8), cam, W, H, pageW)} frame={frame - co.at} duration={co.duration} label={co.label} side={co.side} lead={co.lead} ink={accent} inkText={accentInk} font={font} scale={Math.max(0.9, Math.min(1.5, overlayScale))} inFrames={pace.calloutIn} outFrames={pace.calloutOut} out={co.out ?? true} />
      ))}
      {(tl.ripples ?? []).map((r, i) => {
        const p = toScreen(resolvePoint(r, manifest), cam, W, H, pageW);
        return <Ripple key={`r${i}`} x={p.x} y={p.y} frame={frame - r.at} color={accent} radius={56 * overlayScale} />;
      })}
      {tracks.flatMap((t, i) => [
        ...(t.clicks ?? []).map((at) => ({ at, kind: 'click' as const })),
        ...(t.hovers ?? []).map((at) => ({ at, kind: 'hover' as const })),
      ].map((ev, j) => {
        const { to, arrivedAt } = eventInfo(t, ev.at, pace.cursorMove);
        const pt = toScreen(resolvePoint(to, manifest), cam, W, H, pageW);
        // click → violet frame on the clicked element from arrival until shortly after the click; hover → ring
        const lead = Math.min(14, Math.max(4, ev.at - arrivedAt));
        const ring = 'target' in to ? <ClickFrame rect={rectToScreen(getBox(manifest, to.target), cam, W, H, pageW)} frame={frame - ev.at} color={accent} scale={Math.max(1, overlayScale)} lead={lead} hold={ev.kind === 'hover' ? 30 : 20} fill={ev.kind === 'click'} /> : null;
        return (
          <React.Fragment key={`e${i}-${j}`}>
            {ring}
            {ev.kind === 'click' && <Ripple x={pt.x} y={pt.y} frame={frame - ev.at} color={accent} radius={56 * overlayScale} />}
          </React.Fragment>
        );
      }))}
      <Keycap frame={frame} keys={tl.keys ?? []} W={W} H={H} accent={accent} font={font} />
      {tracks.map((t, i) => {
        const appear = t.appearAt ?? 0;
        if (frame < appear || (t.hideAt !== undefined && frame > t.hideAt + 6)) return null;
        const moves = t.moves.map((m) => ({ ...m, duration: m.duration ?? pace.cursorMove, to: resolvePoint(m.to, manifest) }));
        const cp0 = cursorPosition(frame, resolvePoint(t.start, manifest), moves);
        const dd = drift(frame, t.drift ?? 0);
        const cp = { x: cp0.x + dd.x, y: cp0.y + dd.y };
        const cs = toScreen(cp, cam, W, H, pageW);
        const op = interpolate(frame, [appear, appear + 4], [0, 1], { extrapolateRight: 'clamp' }) * (t.hideAt !== undefined ? interpolate(frame, [t.hideAt, t.hideAt + 6], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1);
        const press = Math.max(0, ...(t.clicks ?? []).map((at) => interpolate(frame - at, [-3, 0, 6], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })));
        return <Cursor key={`k${i}`} x={cs.x} y={cs.y} size={(t.scale ?? 26) * overlayScale} opacity={op} press={press} />;
      })}
      {(tl.texts ?? []).map((t, i) => (
        <TextOverlay key={`t${i}`} frame={frame - t.at} duration={t.duration} text={t.text} x={t.x ?? W / 2} y={t.y ?? H * 0.9} size={t.size} weight={t.weight} font={t.font ?? (t.mono ? mono : font)} color={t.color ?? ink} inFrames={pace.calloutIn + 2} />
      ))}
    </AbsoluteFill>
  );
};

export const UsabilityScene: React.FC<Props> = ({ sceneId, scene, manifest }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  if (!scene || !manifest) return null;
  const tl = scene.composition.timeline;
  const pace = pacingOf(tl.pacing);

  const fontFaces = manifest.fonts.map((f) => {
    const name = f.split('/').pop()!;
    const fam = /mono/i.test(name) ? (scene.composition.theme?.monoFont ?? name.replace(/-.*$/, '')) : name.replace(/-.*$/, '');
    const w = /semibold/i.test(name) ? 600 : /medium/i.test(name) ? 500 : /bold/i.test(name) ? 700 : 400;
    return `@font-face{font-family:'${fam}';src:url('${staticFile(`${sceneId}/${f}`)}') format('woff2');font-weight:${w};}`;
  }).join('\n');

  const wipe = tl.camera.find((k) => k.transition === 'wipe' && frame >= k.at && frame < k.at + (k.wipeFrames ?? pace.wipe));
  return (
    <AbsoluteFill>
      <style>{fontFaces}</style>
      {wipe ? (
        <>
          <SceneLayer frame={wipe.at - 1} scene={scene} manifest={manifest} sceneId={sceneId} />
          <Wipe progress={(frame - wipe.at + 1) / (wipe.wipeFrames ?? pace.wipe)} dir={wipe.direction} W={W} H={H}>
            <SceneLayer frame={frame} scene={scene} manifest={manifest} sceneId={sceneId} />
          </Wipe>
        </>
      ) : (
        <SceneLayer frame={frame} scene={scene} manifest={manifest} sceneId={sceneId} />
      )}
    </AbsoluteFill>
  );
};
