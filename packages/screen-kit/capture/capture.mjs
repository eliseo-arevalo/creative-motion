#!/usr/bin/env node
// Playwright capture driven by a scene JSON.
// Usage: screen-kit-capture scenes/<scene>.json [--captures=public] [--no-video]
// Output: <captures>/<id>/{<state>.png, manifest.json, scene.json, fonts/*, video/*.webm}
// Run from the project folder; playwright is resolved from the project (peer dependency).
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const projectRequire = createRequire(path.join(process.cwd(), 'package.json'));
const { chromium } = projectRequire('playwright');
const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d;
const scenePath = process.argv.slice(2).find((a) => !a.startsWith('--'));
if (!scenePath) { console.error('usage: screen-kit-capture scenes/<scene>.json [--captures=public] [--no-video]'); process.exit(1); }
const noVideo = process.argv.includes('--no-video');
const scene = JSON.parse(await fs.readFile(scenePath, 'utf8'));
const cfg = scene.capture;
const outDir = path.resolve(arg('captures', 'public'), scene.id);
await fs.mkdir(path.join(outDir, 'fonts'), { recursive: true });
await fs.writeFile(path.join(outDir, 'scene.json'), JSON.stringify(scene, null, 2));

const launch = () => chromium.launch({ channel: process.env.PW_CHANNEL ?? 'chrome' }).catch(() => chromium.launch());

function contextOptions(extra = {}) {
  return {
    viewport: cfg.viewport,
    deviceScaleFactor: cfg.deviceScaleFactor ?? 2,
    colorScheme: cfg.colorScheme ?? 'light',
    reducedMotion: cfg.reducedMotion ?? 'no-preference',
    locale: cfg.locale,
    timezoneId: cfg.timezoneId,
    ...extra,
  };
}

async function prepare(ctx) {
  const ls = cfg.localStorage ?? {};
  await ctx.addInitScript((entries) => {
    for (const [k, v] of Object.entries(entries)) { try { localStorage.setItem(k, v); } catch {} }
  }, ls);
  if (cfg.css) await ctx.addInitScript((css) => {
    document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = css; document.head.append(s); });
  }, cfg.css);
}

async function settle(page) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.evaluate(async () => {
    await document.fonts.ready;
    // wait for running CSS transitions/animations (finite ones) to finish
    const anims = document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity);
    await Promise.race([Promise.all(anims.map((a) => a.finished.catch(() => {}))), new Promise((r) => setTimeout(r, 3000))]);
    // wait until every scrollable element (and the window) stops moving (smooth scroll, scrollIntoView)
    const snap = () => [scrollX, scrollY, ...[...document.querySelectorAll('*')].filter((e) => e.scrollHeight > e.clientHeight + 1 || e.scrollWidth > e.clientWidth + 1).map((e) => e.scrollTop + e.scrollLeft * 1e-3)].join(',');
    let last = snap(), stable = 0;
    const t0 = performance.now();
    while (stable < 6 && performance.now() - t0 < 4000) {
      await new Promise((r) => requestAnimationFrame(r));
      const now = snap();
      stable = now === last ? stable + 1 : 0;
      last = now;
    }
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
}

// Per-state device scale factor (e.g. DPR 3 only for states that get zoomed > 2x). Chromium only.
let cdp = null;
async function setDpr(page, dpr) {
  cdp ??= await page.context().newCDPSession(page);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: cfg.viewport.width, height: cfg.viewport.height, deviceScaleFactor: dpr, mobile: false });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

// Scroll "flipbook": after the real action has scrolled a container, re-render N intermediate scroll
// positions (eased) as separate screenshots so Remotion can play the real scroll frame-by-frame.
async function captureScrollSequence(page, st, startScroll, dpr) {
  const seq = st.scrollSequence;
  const files = [];
  const end = await page.evaluate((sel) => document.querySelector(sel).scrollTop, seq.container);
  const n = seq.frames ?? 10;
  for (let i = 1; i < n; i++) {
    const top = startScroll + (end - startScroll) * easeInOut(i / n);
    await page.evaluate(({ sel, top }) => { const el = document.querySelector(sel); el.style.scrollBehavior = 'auto'; el.scrollTo({ top, behavior: 'instant' }); }, { sel: seq.container, top });
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const file = `${st.name}~${String(i).padStart(2, '0')}.png`;
    await page.screenshot({ path: path.join(outDir, file), animations: 'disabled', caret: 'hide', scale: 'device' });
    files.push({ name: `${st.name}~${i}`, file, sequenceOf: st.name, index: i, dpr });
  }
  await page.evaluate(({ sel, top }) => { const el = document.querySelector(sel); el.scrollTo({ top, behavior: 'instant' }); el.style.scrollBehavior = ''; }, { sel: seq.container, top: end });
  return files;
}

async function runAction(page, a, boxes) {
  switch (a.type) {
    case 'goto': await page.goto(a.url, { waitUntil: 'networkidle' }); break;
    case 'waitForSelector': await page.waitForSelector(a.selector, { state: a.state ?? 'visible' }); break;
    case 'hover': await page.hover(a.selector, a.position ? { position: a.position } : {}); break;
    case 'click': await page.click(a.selector, a.position ? { position: a.position } : {}); break;
    case 'press': await page.keyboard.press(a.key); break;
    case 'type': await page.fill(a.selector, a.text); break;
    case 'mouseMove': await page.mouse.move(a.x, a.y, { steps: a.steps ?? 1 }); break;
    case 'scroll': await page.mouse.wheel(a.dx ?? 0, a.dy ?? 0); break;
    case 'blur': await page.evaluate(() => document.activeElement?.blur?.()); break;
    case 'eval': await page.evaluate(a.js); break;
    case 'wait': await page.waitForTimeout(a.ms); break;
    default: throw new Error(`unknown action ${a.type}`);
  }
  if (a.settle !== false && a.type !== 'wait') await settle(page);
}

// targets: "sel" (first match) | ["selA", "selB"] (union of first matches) | { selector, all: true } (union of all matches)
async function measure(page) {
  const boxes = {};
  for (const [name, spec] of Object.entries(cfg.targets ?? {})) {
    const r = await page.evaluate((spec) => {
      const list = Array.isArray(spec) ? spec.map((s) => document.querySelector(s)) : typeof spec === 'string' ? [document.querySelector(spec)] : spec.all ? [...document.querySelectorAll(spec.selector)] : [document.querySelector(spec.selector)];
      const rects = list.filter(Boolean).map((el) => el.getBoundingClientRect()).filter((b) => b.width > 0 || b.height > 0);
      if (!rects.length) return null;
      const x0 = Math.min(...rects.map((b) => b.left)), y0 = Math.min(...rects.map((b) => b.top));
      const x1 = Math.max(...rects.map((b) => b.right)), y1 = Math.max(...rects.map((b) => b.bottom));
      return { x: x0 + scrollX, y: y0 + scrollY, width: x1 - x0, height: y1 - y0 };
    }, spec);
    if (r) boxes[name] = r;
  }
  return boxes;
}

const report = { theme: {}, fonts: {}, asserts: [] };
const browser = await launch();
const fontUrls = new Set();

// ---- Pass A: high-res stills per state ----
{
  const ctx = await browser.newContext(contextOptions());
  await prepare(ctx);
  const page = await ctx.newPage();
  page.on('response', (r) => { if (/\.(woff2?|ttf|otf)(\?|$)/i.test(r.url())) fontUrls.add(r.url()); });
  const t0 = Date.now();
  await page.goto(cfg.url, { waitUntil: 'networkidle' });
  await settle(page);
  for (const a of cfg.setup ?? []) await runAction(page, a);

  for (const as of cfg.assert ?? []) {
    const v = await page.evaluate(as.js);
    const ok = as.equals !== undefined ? v === as.equals : as.startsWith !== undefined ? String(v).startsWith(as.startsWith) : Boolean(v);
    report.asserts.push({ ...as, value: v, ok });
    if (!ok) console.warn(`  ! assert failed: ${as.js} -> ${v}`);
  }
  report.fonts.loaded = await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family.replace(/"/g, '')} ${f.weight}`));
  report.fonts.checks = [];
  for (const fc of cfg.fontCheck ?? []) {
    const res = await page.evaluate(({ selector, family }) => {
      const el = document.querySelector(selector);
      if (!el) return { found: false };
      const cs = getComputedStyle(el);
      const first = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim();
      return { found: true, computed: cs.fontFamily, firstFamily: first, available: document.fonts.check(`${cs.fontWeight} ${cs.fontSize} "${first}"`) };
    }, fc);
    report.fonts.checks.push({ ...fc, ...res, ok: res.found && res.firstFamily === fc.family && res.available });
  }

  const states = [];
  let boxes = null;
  const baseDpr = cfg.deviceScaleFactor ?? 2;
  let curDpr = baseDpr;
  for (const st of cfg.states) {
    const dpr = st.dpr ?? baseDpr;
    if (dpr !== curDpr) { await setDpr(page, dpr); curDpr = dpr; }
    const startScroll = st.scrollSequence ? await page.evaluate((sel) => document.querySelector(sel)?.scrollTop ?? 0, st.scrollSequence.container) : 0;
    for (const a of st.actions ?? []) await runAction(page, a);
    await settle(page);
    const file = `${st.name}.png`;
    await page.screenshot({ path: path.join(outDir, file), animations: 'disabled', caret: 'hide', scale: 'device' });
    const b = await measure(page);
    boxes ??= b;
    let seq = [];
    if (st.scrollSequence) seq = await captureScrollSequence(page, st, startScroll, dpr);
    const probe = cfg.stateProbe ? await page.evaluate(cfg.stateProbe) : undefined;
    states.push(...seq, { name: st.name, file, boxes: b, dpr, probe });
    console.log(`  ✓ state ${st.name} @${dpr}x${seq.length ? ` (+${seq.length} scroll frames)` : ''}${probe !== undefined ? `  probe=${JSON.stringify(probe)}` : ''}`);
  }
  report.stillsMs = Date.now() - t0;

  // harvest fonts so Remotion overlays can use the app's typefaces
  const fonts = [];
  for (const u of fontUrls) {
    try {
      const res = await ctx.request.get(u);
      const name = decodeURIComponent(new URL(u).pathname.split('/').pop());
      await fs.writeFile(path.join(outDir, 'fonts', name), await res.body());
      fonts.push(`fonts/${name}`);
    } catch (e) { console.warn('  ! font download failed', u); }
  }
  await ctx.close();

  const manifest = {
    id: scene.id,
    capturedAt: new Date().toISOString(),
    url: cfg.url,
    viewport: cfg.viewport,
    deviceScaleFactor: cfg.deviceScaleFactor ?? 2,
    states,
    boxes,
    fonts,
    report,
  };
  await fs.writeFile(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  globalThis.__manifest = manifest;
}

// ---- Pass B (optional): Playwright recordVideo of the interaction, for comparison ----
if (cfg.video?.enabled && !noVideo) {
  const vdir = path.join(outDir, 'video');
  await fs.mkdir(vdir, { recursive: true });
  const ctx = await browser.newContext(contextOptions({ recordVideo: { dir: vdir, size: cfg.viewport } }));
  await prepare(ctx);
  const page = await ctx.newPage();
  await page.goto(cfg.url, { waitUntil: 'networkidle' });
  await settle(page);
  for (const a of cfg.setup ?? []) await runAction(page, a);
  const boxes = globalThis.__manifest.boxes;
  const pts = cfg.video.path.map((p) => (p.target ? { x: boxes[p.target].x + (p.dx ?? 0), y: boxes[p.target].y + (p.dy ?? 0) } : p));
  await page.mouse.move(pts[0].x, pts[0].y);
  await page.waitForTimeout(600);
  for (let i = 1; i < pts.length; i++) {
    const steps = Math.round((cfg.video.moveMs ?? 1200) / 16);
    await page.mouse.move(pts[i].x, pts[i].y, { steps });
  }
  await page.waitForTimeout(cfg.video.holdMs ?? 1500);
  const v = page.video();
  await ctx.close();
  const src = await v.path();
  await fs.rename(src, path.join(vdir, 'interaction.webm'));
  console.log('  ✓ recordVideo -> video/interaction.webm');
}

await browser.close();
console.log(JSON.stringify(globalThis.__manifest.report, null, 2));
console.log(`done -> ${outDir}`);
