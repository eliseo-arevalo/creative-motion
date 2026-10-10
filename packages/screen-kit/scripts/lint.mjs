#!/usr/bin/env node
// Scene lint: enforces the storytelling rules before rendering.
//   screen-kit-lint <sceneId> [--strict] [--scenes=scenes] [--captures=public]
//   or: import { lint } from '@eliseo-arevalo/screen-kit/lint'
// Rules (override in composition.timeline.rules):
//   continuity   – no cut/wipe between distant zones; distant spring moves should be 'zone'
//   maxScaleRatio– no single camera leg changes scale by more than this (default 2)
//   maxCallouts  – default 2
//   cursorAlways – cursor visible the whole video, and every state change is preceded by a cursor
//                  arrival/click on screen (±8 frames)
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

export function lint(scene, m) {
  const tl = scene.composition.timeline;
  const rules = { continuity: true, maxCallouts: 2, cursorAlways: true, maxScaleRatio: 2, emphasisMatchesClick: true, clickFrames: true, startScale: 1, maxZoom: 1.8, minHold: 30, minMove: 30,
    // research-derived (RESEARCH-demo-videos.md)
    maxActionsPer10s: 2, maxZoomInsPerMin: 3, stillOnAction: true, resultInView: true, readingWps: 3, minTextHold: 36, maxLabelChars: 60, minReadHold: 60,
    ...(tl.rules ?? {}) };
  const PACE = { snappy: { camera: 16, zone: 24 }, calm: { camera: 45, zone: 40 }, gentle: { camera: 36, zone: 40 } }[tl.pacing ?? 'calm'];
  const { width: W, height: H } = m.viewport;
  const out = [];
  const warn = (msg) => out.push(msg);
  const box = (ref) => {
    const [n, st] = ref.split('@');
    const b = (st ? m.states.find((s) => s.name === st)?.boxes : m.boxes)?.[n];
    if (!b) warn(`unknown target ${ref}`);
    return b ?? { x: 0, y: 0, width: W, height: H };
  };
  const cam = (to) => {
    if (to === 'full') return { cx: W / 2, cy: H / 2, s: 1 };
    if (to === 'wide') return { cx: W / 2, cy: H / 2, s: tl.wideScale ?? 0.9 };
    if (to.wide) return { cx: W / 2, cy: H / 2, s: to.wide };
    const r = to.rect ?? box(to.target);
    const pad = to.padding ?? 80;
    const s = to.scale ?? Math.min(W / (r.width + 2 * pad), H / (r.height + 2 * pad), to.maxScale ?? tl.maxScale ?? 3);
    const c = { cx: r.x + r.width / 2, cy: r.y + r.height / 2, s };
    if (s > 1) { const hw = W / (2 * s), hh = H / (2 * s); c.cx = Math.min(Math.max(c.cx, hw), W - hw); c.cy = Math.min(Math.max(c.cy, hh), H - hh); }
    return c;
  };
  // camera
  const keys = tl.camera;
  for (let i = 1; i < keys.length; i++) {
    const a = cam(keys[i - 1].to), b = cam(keys[i].to), k = keys[i];
    const tr = k.transition ?? 'spring';
    // distance in units of the smaller view width: >0.6 means the next point is (mostly) off-screen
    const viewW = W / Math.max(a.s, b.s);
    const dist = Math.hypot(a.cx - b.cx, a.cy - b.cy) / viewW;
    const ratio = Math.max(a.s, b.s) / Math.min(a.s, b.s);
    if (rules.continuity && (tr === 'cut' || tr === 'wipe') && dist > 0.25) warn(`frame ${k.at}: ${tr} between distant zones (d=${dist.toFixed(2)} views) → use transition "zone"`);
    if (rules.continuity && tr === 'spring' && dist > 0.6) warn(`frame ${k.at}: spring pan of ${dist.toFixed(2)} views → use transition "zone" (auto zoom-out midpoint)`);
    if (tr === 'spring' && ratio > rules.maxScaleRatio) warn(`frame ${k.at}: scale change ${ratio.toFixed(2)}x in one move (> ${rules.maxScaleRatio}x)`);
    if (tr === 'zone' && ratio > rules.maxScaleRatio ** 2) warn(`frame ${k.at}: zone change ${ratio.toFixed(2)}x cannot stay within ${rules.maxScaleRatio}x per leg`);
    if (tr === 'zone' && k.duration && k.duration > 60) warn(`frame ${k.at}: zone duration ${k.duration} > 60 (drags)`);
  }
  // start at 100%, zoom ceiling, minimum move duration
  {
    const s0 = cam(keys[0].to).s;
    if (rules.startScale && Math.abs(s0 - rules.startScale) > 0.01) warn(`video starts at scale ${s0.toFixed(2)} (rule: start at ${rules.startScale}, page filling the frame)`);
    for (const k of keys) {
      const sc = cam(k.to).s;
      if (rules.maxZoom && sc > rules.maxZoom + 1e-3) warn(`frame ${k.at}: zoom ${sc.toFixed(2)}x above ceiling ${rules.maxZoom}x`);
    }
    for (const k of keys.slice(1)) {
      const tr = k.transition ?? 'spring';
      if (tr === 'cut' || tr === 'wipe') continue;
      const d = k.duration ?? (tr === 'zone' ? PACE.zone : PACE.camera);
      if (rules.minMove && d < rules.minMove) warn(`frame ${k.at}: ${tr} move of ${d} frames (< ${rules.minMove}); give the eye time`);
    }
  }
  // reading time after each state change
  if (rules.minHold) {
    const st = tl.states;
    for (let i = 1; i < st.length - 1; i++) {
      const settled = st[i].at + (st[i].playFrames ?? 0);
      const gap = st[i + 1].at - settled;
      if (gap < rules.minHold) warn(`frame ${st[i].at}: state "${st[i].name}" shown only ${gap} frames before "${st[i + 1].name}" (< ${rules.minHold})`);
    }
  }
  // callouts
  const nc = (tl.callouts ?? []).length;
  if (nc > rules.maxCallouts) warn(`${nc} callouts (> ${rules.maxCallouts}); let camera + cursor + real UI tell it`);
  // cursor
  const tracks = tl.cursors ?? (tl.cursor ? [tl.cursor] : []);
  const total = scene.composition.durationInFrames;
  if (rules.cursorAlways) {
    if (!tracks.length) warn('no cursor track');
    const covered = new Array(total).fill(false);
    for (const t of tracks) for (let f = t.appearAt ?? 0; f < Math.min(total, t.hideAt ?? total); f++) covered[f] = true;
    const gaps = covered.reduce((n, v) => n + (v ? 0 : 1), 0);
    if (gaps > 20) warn(`cursor hidden for ${gaps} frames (cursorAlways)`);
    const events = [...tracks.flatMap((t) => [...(t.clicks ?? []), ...t.moves.flatMap((mv) => [mv.at, mv.at + (mv.duration ?? 18)])]), ...(tl.keys ?? []).map((k) => k.at)];
    for (const st of tl.states.slice(1)) {
      if (!events.some((e) => Math.abs(e - st.at) <= 8)) warn(`frame ${st.at}: state "${st.name}" changes without a cursor click/arrival or key press nearby`);
    }
  }
  // emphasis ↔ click: any callout/highlight/explicit ripple active near a click or hover must point at the
  // same element the cursor is on (same target id, ignoring @state)
  if (rules.emphasisMatchesClick) {
    const base = (ref) => String(ref).split('@')[0];
    const WIN = 15;
    for (const t of tracks) {
      for (const [kind, list] of [['click', t.clicks ?? []], ['hover', t.hovers ?? []]]) {
        for (const at of list) {
          let to = t.start;
          for (const mv of t.moves) if (mv.at + (mv.duration ?? 18) <= at + 1) to = mv.to;
          if (!to.target) { warn(`frame ${at}: ${kind} lands on raw coordinates${kind === 'click' && rules.clickFrames ? ' → click lacks a same-target frame' : ''}; move the cursor to a named target`); continue; }
          if (kind === 'click' && rules.clickFrames) {
            const [n, stName] = to.target.split('@');
            const bx = (stName ? m.states.find((x) => x.name === stName)?.boxes : m.boxes)?.[n];
            if (!bx || bx.width <= 0 || bx.height <= 0) warn(`frame ${at}: click target "${to.target}" has no measured box → no frame can be drawn on it`);
          }
          const emph = [...(tl.callouts ?? []).map((c) => ({ ...c, kind: 'callout' })), ...(tl.highlights ?? []).map((h) => ({ ...h, kind: 'highlight' }))];
          for (const e of emph) {
            const active = e.at <= at + WIN && e.at + e.duration >= at - WIN;
            if (active && base(e.target) !== base(to.target)) warn(`frame ${at}: ${e.kind} on "${e.target}" (frames ${e.at}–${e.at + e.duration}) while the cursor ${kind}s "${to.target}" → same element or move the emphasis away from the click`);
          }
          for (const r of tl.ripples ?? []) if (Math.abs(r.at - at) <= WIN && base(r.target) !== base(to.target)) warn(`frame ${at}: ripple on "${r.target}" but cursor ${kind}s "${to.target}"`);
        }
      }
    }
  }
  // the cursor should not travel to a different element while a callout box is on screen
  if (rules.emphasisMatchesClick) {
    for (const t of tracks) for (const mv of t.moves) {
      if (!mv.to.target) continue;
      const end = mv.at + (mv.duration ?? 18);
      for (const c of tl.callouts ?? []) {
        if (c.at < end && c.at + c.duration > mv.at && c.target.split('@')[0] !== mv.to.target.split('@')[0]) warn(`frames ${mv.at}–${end}: cursor travels to "${mv.to.target}" while callout on "${c.target}" is visible`);
      }
    }
  }

  // ── research-derived rules (see RESEARCH-demo-videos.md) ──────────────────────────────
  const fps = scene.composition.fps ?? 30;
  const dur = (k, i) => (i === 0 || ['cut', 'wipe'].includes(k.transition ?? 'spring')) ? 0 : (k.duration ?? ((k.transition ?? 'spring') === 'zone' ? PACE.zone : PACE.camera));
  const camAt = (f) => { // {pose, moving}
    let i = 0; for (let j = 0; j < keys.length; j++) if (keys[j].at <= f) i = j;
    return { pose: cam(keys[i].to), moving: f < keys[i].at + dur(keys[i], i) && f >= keys[i].at && i > 0, key: i };
  };
  const actions = [
    ...tracks.flatMap((t) => [...(t.clicks ?? []).map((at) => ({ at, kind: 'click' })), ...(t.hovers ?? []).map((at) => ({ at, kind: 'hover' }))]),
    ...(tl.keys ?? []).map((k) => ({ at: k.at, kind: `key ${k.key}` })),
  ].sort((a, b) => a.at - b.at);
  // a) action density: max N actions in any 10 s window (one idea per beat)
  if (rules.maxActionsPer10s) {
    const win = 10 * fps;
    for (let i = 0; i < actions.length; i++) {
      const n = actions.filter((a) => a.at >= actions[i].at && a.at < actions[i].at + win).length;
      if (n > rules.maxActionsPer10s) { warn(`frame ${actions[i].at}: ${n} actions within 10 s (> ${rules.maxActionsPer10s}); cut steps or spread them`); break; }
    }
    const per = actions.length / (total / fps) * 10;
    if (per > rules.maxActionsPer10s) warn(`${actions.length} actions in ${(total / fps).toFixed(1)} s = ${per.toFixed(1)} per 10 s (> ${rules.maxActionsPer10s})`);
  }
  // b) zoom budget: zoom-ins (scale rises above 1.05) ≤ maxZoomInsPerMin, pro-rated, min 1
  if (rules.maxZoomInsPerMin) {
    let n = 0; for (let i = 1; i < keys.length; i++) { const a = cam(keys[i - 1].to).s, b = cam(keys[i].to).s; if (b > 1.05 && (b > a + 0.05 || keys[i].transition === 'zone')) n++; }
    const allowed = Math.max(1, Math.ceil(rules.maxZoomInsPerMin * total / fps / 60));
    if (n > allowed) warn(`${n} zoom-ins in ${(total / fps).toFixed(1)} s (budget ${allowed} = ${rules.maxZoomInsPerMin}/min); zoom only where text must be read`);
  }
  // c) camera holds still during every action (camera OR action, never both)
  if (rules.stillOnAction) {
    for (const a of actions) {
      const bad = [a.at - 6, a.at, a.at + 20].find((f) => camAt(f).moving);
      if (bad !== undefined) warn(`frame ${a.at}: camera moving around the ${a.kind} (at frame ${bad}); move, settle, then act`);
    }
  }
  // d) result in view: a state with "result": "<target>" must be inside the settled frame right after it appears
  if (rules.resultInView) {
    for (const st of tl.states) {
      if (!st.result) continue;
      const f = st.at + (st.playFrames ?? 0) + 10;
      const { pose, moving } = camAt(f);
      const r = box(st.result.includes('@') ? st.result : `${st.result}@${st.name}`);
      const hw = W / (2 * pose.s), hh = H / (2 * pose.s);
      const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
      const inside = Math.abs(cx - pose.cx) <= hw && Math.abs(cy - pose.cy) <= hh;
      if (moving || !inside) warn(`frame ${st.at}: result "${st.result}" of state "${st.name}" is ${moving ? 'under a moving camera' : 'outside the frame'} right after the action; show the result where the click happened`);
    }
  }
  // e) reading: camera keys with read:<words> must hold still ≥ max(minReadHold, words / wps)
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i]; if (k.read == null) continue;
    const arrive = k.at + dur(k, i), next = keys[i + 1]?.at ?? total;
    const need = Math.max(rules.minReadHold, Math.ceil(k.read / rules.readingWps * fps));
    if (next - arrive < need) warn(`frame ${k.at}: read-hold ${next - arrive} f for ~${k.read} words (< ${need} f at ${rules.readingWps} words/s)`);
  }
  // f) overlay text: ≤ maxLabelChars and on screen ≥ max(minTextHold, words / wps)
  for (const c of [...(tl.callouts ?? []).map((c) => ({ ...c, text: c.label })), ...(tl.texts ?? [])]) {
    const txt = c.text ?? ''; const words = txt.trim().split(/\s+/).filter(Boolean).length;
    if (txt.length > rules.maxLabelChars) warn(`"${txt}" is ${txt.length} chars (> ${rules.maxLabelChars})`);
    const shown = c.duration ?? (total - c.at);
    const need = Math.max(rules.minTextHold, Math.ceil(words / rules.readingWps * fps) + 15);
    if (shown < need) warn(`frame ${c.at}: "${txt}" visible ${shown} f (< ${need} f for ${words} words)`);
  }
  return out;
}

// CLI: screen-kit-lint <sceneId> [--strict] [--scenes=scenes] [--captures=public]
if (process.argv[1] && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) {
  const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d;
  const id = process.argv.slice(2).find((a) => !a.startsWith('--'));
  if (!id) { console.error('usage: screen-kit-lint <sceneId> [--strict] [--scenes=scenes] [--captures=public]'); process.exit(1); }
  const scene = JSON.parse(fs.readFileSync(`${arg('scenes', 'scenes')}/${id}.json`, 'utf8'));
  const m = JSON.parse(fs.readFileSync(`${arg('captures', 'public')}/${id}/manifest.json`, 'utf8'));
  const w = lint(scene, m);
  for (const x of w) console.log(`⚠ ${x}`);
  console.log(w.length ? `${w.length} warning(s)` : '✓ lint clean');
  if (w.length && process.argv.includes('--strict')) process.exit(1);
}
