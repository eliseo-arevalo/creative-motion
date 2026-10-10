import { spring, interpolate } from 'remotion';
import type { BoxRef, CameraKey, CameraTo, Manifest, Pt, Rect, TargetRef } from './types';

export type Cam = { cx: number; cy: number; s: number };

export const getBox = (m: Manifest, ref: BoxRef): Rect => {
  const [name, state] = ref.split('@');
  const boxes = state ? m.states.find((s) => s.name === state)?.boxes : m.boxes;
  const b = boxes?.[name];
  if (!b) throw new Error(`unknown target ${ref}`);
  return b;
};

export const resolvePoint = (p: Pt | TargetRef, m: Manifest): Pt => {
  if ('target' in p) {
    const b = getBox(m, p.target);
    return { x: b.x + (p.dx ?? b.width / 2), y: b.y + (p.dy ?? b.height / 2) };
  }
  return p;
};

export const resolveCam = (to: CameraTo, m: Manifest, wideScale: number, maxScale = 3): Cam => {
  const { width: W, height: H } = m.viewport;
  if (to === 'full') return { cx: W / 2, cy: H / 2, s: 1 };
  if (to === 'wide') return { cx: W / 2, cy: H / 2, s: wideScale };
  if ('wide' in to) return { cx: W / 2 - (to.dx ?? 0) / to.wide, cy: H / 2 - (to.dy ?? 0) / to.wide, s: to.wide };
  const r: Rect = 'rect' in to ? to.rect : getBox(m, to.target);
  const pad = to.padding ?? 80;
  const fit = Math.min(W / (r.width + pad * 2), H / (r.height + pad * 2));
  const s = to.scale ?? Math.min(fit, to.maxScale ?? maxScale);
  const dx = 'dx' in to ? to.dx ?? 0 : 0, dy = 'dy' in to ? to.dy ?? 0 : 0;
  return clamp({ cx: r.x + r.width / 2 + dx, cy: r.y + r.height / 2 + dy, s }, W, H);
};

// keep the viewport inside the page when zoomed in
export const clamp = (c: Cam, W: number, H: number): Cam => {
  if (c.s <= 1) return c;
  const hw = W / (2 * c.s), hh = H / (2 * c.s);
  return { s: c.s, cx: Math.min(Math.max(c.cx, hw), W - hw), cy: Math.min(Math.max(c.cy, hh), H - hh) };
};

// Camera keys: 'spring' (default) eases from the previous pose with a critically-damped spring
// (scale interpolated in log space so zooms feel even); 'cut' and 'wipe' jump to the new pose
// (the wipe itself is drawn by the scene, see UsabilityScene).
// Midpoint scale for a zone change: the largest scale whose view contains both poses' views,
// limited so neither leg changes scale by more than maxRatio (default 2x).
export const zoneMidScale = (a: Cam, b: Cam, W: number, H: number, maxRatio = 2, floor = 1): number => {
  const va = { x0: a.cx - W / (2 * a.s), x1: a.cx + W / (2 * a.s), y0: a.cy - H / (2 * a.s), y1: a.cy + H / (2 * a.s) };
  const vb = { x0: b.cx - W / (2 * b.s), x1: b.cx + W / (2 * b.s), y0: b.cy - H / (2 * b.s), y1: b.cy + H / (2 * b.s) };
  const uw = Math.max(va.x1, vb.x1) - Math.min(va.x0, vb.x0);
  const uh = Math.max(va.y1, vb.y1) - Math.min(va.y0, vb.y0);
  const fit = Math.min(W / uw, H / uh);
  let mid = Math.min(Math.min(a.s, b.s), Math.max(fit, Math.max(a.s, b.s) / maxRatio));
  if (Math.min(a.s, b.s) >= floor) mid = Math.max(mid, floor); // don't reveal beyond the page
  return mid;
};

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

// Zone change pose at progress t∈[0,1]: log-scale dips to the midpoint (smooth bump), centre eased.
export const zonePose = (a: Cam, b: Cam, t: number, W: number, H: number, maxRatio = 2, floor = 1): Cam => {
  const e = easeInOutCubic(Math.min(1, Math.max(0, t)));
  const mid = zoneMidScale(a, b, W, H, maxRatio, floor);
  const la = Math.log(a.s), lb = Math.log(b.s);
  const bump = Math.max(0, (la + lb) / 2 - Math.log(mid));
  const ls = la + (lb - la) * e - bump * 4 * e * (1 - e);
  // centre travels mostly while zoomed out: slightly steeper curve than the scale
  const ec = (1 - Math.cos(Math.PI * e)) / 2; // sine on top of cubic: centre leaves late, lands early
  return { cx: a.cx + (b.cx - a.cx) * ec, cy: a.cy + (b.cy - a.cy) * ec, s: Math.exp(ls) };
};

export const cameraAt = (frame: number, fps: number, keys: CameraKey[], m: Manifest, wideScale: number, defaultDuration: number, maxScale?: number, zoneDuration = 24, maxRatio = 2, zoneFloor = 1): Cam => {
  const { width: W, height: H } = m.viewport;
  let cur = resolveCam(keys[0].to, m, wideScale, maxScale);
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (frame < k.at) break;
    const next = resolveCam(k.to, m, wideScale, maxScale);
    if (k.transition === 'cut' || k.transition === 'wipe') { cur = next; continue; }
    if (k.transition === 'zone') {
      const d = k.duration ?? zoneDuration;
      cur = clamp(zonePose(cur, next, (frame - k.at) / d, W, H, maxRatio, zoneFloor), W, H);
      continue;
    }
    if (k.transition === 'ease') {
      const d = k.duration ?? defaultDuration;
      const t = Math.min(1, Math.max(0, (frame - k.at) / d));
      const p = k.easing === 'sine' ? (1 - Math.cos(Math.PI * t)) / 2 : easeInOutCubic(t);
      cur = { cx: cur.cx + (next.cx - cur.cx) * p, cy: cur.cy + (next.cy - cur.cy) * p, s: Math.exp(Math.log(cur.s) + (Math.log(next.s) - Math.log(cur.s)) * p) };
      continue;
    }
    const d = k.duration ?? defaultDuration;
    const p = spring({ frame: frame - k.at, fps, durationInFrames: d, config: { damping: 200, mass: 1, stiffness: 80 } });
    cur = {
      cx: interpolate(p, [0, 1], [cur.cx, next.cx]),
      cy: interpolate(p, [0, 1], [cur.cy, next.cy]),
      s: Math.exp(interpolate(p, [0, 1], [Math.log(cur.s), Math.log(next.s)])),
    };
  }
  return clamp(cur, m.viewport.width, m.viewport.height);
};

export const toScreen = (p: Pt, c: Cam, outW: number, outH: number, pageW: number): Pt => {
  const k = outW / pageW;
  return { x: outW / 2 + (p.x - c.cx) * c.s * k, y: outH / 2 + (p.y - c.cy) * c.s * k };
};
export const rectToScreen = (r: Rect, c: Cam, outW: number, outH: number, pageW: number): Rect => {
  const a = toScreen({ x: r.x, y: r.y }, c, outW, outH, pageW);
  const k = (outW / pageW) * c.s;
  return { x: a.x, y: a.y, width: r.width * k, height: r.height * k };
};
