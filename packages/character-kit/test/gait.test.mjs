// Walk v7 (natural gait) tests: hip arc, soft knees, anticipation, settle, variation, chained
// turns, loose arms, skirt swing and back-compat: npm test
import { build } from "esbuild";
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outfile = join(mkdtempSync(join(tmpdir(), "ck-gait-")), "kit.cjs");
await build({
  stdin: { contents: `export * from "./src/index.ts"; export { renderToStaticMarkup } from "react-dom/server"; export { createElement } from "react";`, resolveDir: join(here, ".."), loader: "ts" },
  bundle: true, platform: "node", format: "cjs", outfile, logLevel: "error", jsx: "automatic",
});
const K = (await import(pathToFileURL(outfile).href)).default;

const FPS = 30;
const RIGS = { adult: K.ADULT, child: K.CHILD };
const IDLE = [{ at: 0, clip: "idle" }];
const body = (p, f, opts) => K.evaluateBody(IDLE, f, FPS, p, opts);
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const steadyLands = (plan) => plan.lands.slice(1, -2);

for (const [rn, p] of Object.entries(RIGS)) {
  const walk = [{ at: 5, to: 400 }];
  const plan = K.feetPlanOf(IDLE, undefined, walk, FPS, p);

  test(`${rn}: hip arc — lowest just after each heel strike, highest near passing`, () => {
    for (const l of steadyLands(plan)) {
      const hy = (f) => body(p, f, { walk }).lower.hip.y; // screen y: bigger = lower
      const down = Math.max(...range(Math.round(l.t), Math.round(l.t + 4)).map(hy));
      const up = Math.min(...range(Math.round(l.t + 0.45 * l.S), Math.round(l.t + 0.8 * l.S)).map(hy));
      assert.ok(down - up > 5, `land ${l.t}: bob ${down - up}`);
      const g = K.gaitAt(plan, l.t + 0.6 * l.S);
      assert.ok(Math.abs(g.phase - 0.6) < 0.08, `phase ${g.phase}`);
    }
  });

  test(`${rn}: the stance knee is never locked nor deeply bent while walking`, () => {
    const seg = plan.segs[0];
    for (let f = seg.t0 + 15; f < seg.t1 - 2; f++) {
      const lo = body(p, f, { walk }).lower;
      for (const k of ["L", "R"]) {
        if (lo[k].foot.swinging || lo[k].foot.contact < 1) continue;
        if (lo[k === "L" ? "R" : "L"].foot.swinging) {
          assert.ok(lo[k].bend > 4, `f${f} ${k} stance knee locked (${lo[k].bend})`);
          assert.ok(lo[k].bend < 50, `f${f} ${k} stance knee crouched (${lo[k].bend})`);
        }
      }
    }
  });

  test(`${rn}: anticipation — weight moves onto the support foot and the hips dip before the first lift`, () => {
    const w = [{ at: 20, to: 300 }];
    const pl = K.feetPlanOf(IDLE, undefined, w, FPS, p);
    const first = Math.min(...[...pl.L.swings, ...pl.R.swings].map((s) => s.t0));
    const before = body(p, first - 1, { walk: w }).lower;
    const rest = body(p, first - 14, { walk: w }).lower;
    assert.ok(Math.abs(before.weight) > 0.25, `weight ${before.weight}`);
    assert.ok(before.hip.y > rest.hip.y + 3, "the hips dip before the step");
    assert.ok(!before.L.foot.swinging && !before.R.foot.swinging, "both feet still down");
  });

  test(`${rn}: the stop overshoots a little and settles back on the mark`, () => {
    const seg = plan.segs[0];
    const xs = range(seg.t1, seg.t1 + 30).map((f) => K.walkOffset(walk, f, FPS, p));
    const over = Math.max(...xs) - 400;
    assert.ok(over > 1.5 && over < 12, `overshoot ${over}`);
    assert.ok(Math.abs(K.walkOffset(walk, seg.t1 + 40, FPS, p) - 400) < 0.01, "settles on the mark");
    const after = body(p, seg.end + 30, { walk }).lower;
    assert.ok(Math.abs(after.sink) < 1.5 && after.walk < 0.01, "back at rest");
  });

  test(`${rn}: cycles are not identical, and each character (seed) walks a little differently`, () => {
    const amps = plan.lands.map((l) => l.amp.toFixed(3));
    assert.ok(new Set(amps).size > 1, "every step the same");
    const a = K.feetPlanOf(IDLE, undefined, walk, FPS, p, 1);
    const b = K.feetPlanOf(IDLE, undefined, walk, FPS, p, 2);
    assert.notDeepEqual(a.lands, b.lands);
    assert.deepEqual(K.feetPlanOf(IDLE, undefined, walk, FPS, p, 1).lands, a.lands, "deterministic");
    const hy = (s, f) => body(p, f, { walk, seed: s }).lower.hip.y;
    assert.ok(range(20, 50).some((f) => Math.abs(hy(1, f) - hy(2, f)) > 0.05), "seed changes the gait");
  });

  test(`${rn}: a chained walk turns round without stopping, one foot always down`, () => {
    const w = [{ at: 10, to: -200 }, { at: 30, to: 170, chain: true }];
    const pl = K.feetPlanOf(IDLE, undefined, w, FPS, p);
    const end = pl.segs[pl.segs.length - 1].t1;
    let minW = 1, crossed = false, prevYaw = null;
    for (let f = 0; f <= end + 30; f++) {
      const b = body(p, f, { walk: w, plan: pl });
      assert.ok(!(b.lower.L.foot.swinging && b.lower.R.foot.swinging), `both feet up at f${f}`);
      if (f > 30 && f < end - 10) minW = Math.min(minW, b.walking);
      if (prevYaw !== null && Math.sign(prevYaw) !== Math.sign(b.yawB) && prevYaw !== 0) crossed = true;
      prevYaw = b.yawB;
    }
    assert.ok(minW > 0.6, `walk dropped to ${minW} at the turn`);
    assert.ok(crossed, "the body turns through the front");
    const unchained = K.feetPlanOf(IDLE, undefined, [{ at: 10, to: -200 }, { at: 30, to: 170 }], FPS, p);
    assert.ok(pl.segs[1].t0 <= unchained.segs[1].t0, "chaining never starts later");
  });

  test(`${rn}: loose arms — the forearm and hand trail the upper arm`, () => {
    // The lag (frames) that best lines one angle curve up with another, over two steady cycles.
    const arms = range(15, 75).map((f) => body(p, f, { walk }).pose.armL);
    const series = (fn) => { const v = arms.map(fn); const m = v.reduce((x, y) => x + y, 0) / v.length; return v.map((x) => x - m); };
    const lagOf = (a, b) => {
      let best = -Infinity, at = 0;
      for (let k = 0; k <= 8; k++) {
        let c = 0;
        for (let i = 0; i + k < a.length; i++) c += a[i] * b[i + k];
        if (c > best) { best = c; at = k; }
      }
      return at;
    };
    const sh = series((a) => a.shoulder);
    const fore = series((a) => a.shoulder + a.elbow);
    const hand = series((a) => a.shoulder + a.elbow + a.wrist);
    assert.ok(lagOf(sh, fore) >= 1, `forearm lag ${lagOf(sh, fore)}`);
    assert.ok(lagOf(sh, hand) >= lagOf(sh, fore), `hand lag ${lagOf(sh, hand)}`);
  });
}

test("WalkKey bounce / arms scale the bob and the arm swing", () => {
  const p = K.ADULT;
  const bob = (extra) => {
    const w = [{ at: 5, to: 400, ...extra }];
    const ys = range(20, 45).map((f) => body(p, f, { walk: w }).lower.hip.y);
    return Math.max(...ys) - Math.min(...ys);
  };
  assert.ok(bob({ bounce: 2 }) > bob({}) + 1 && bob({}) > bob({ bounce: 0 }) + 1, "bounce");
  const w0 = [{ at: 5, to: 400, arms: 0 }];
  for (const f of [20, 30, 40]) assert.ok(Math.abs(body(p, f, { walk: w0 }).pose.armL.shoulder - body(p, f, {}).pose.armL.shoulder) < 1e-6, "arms 0: no shoulder swing");
});

test("back-compat: no seed is seed 0, and walks without the new fields still plan", () => {
  const p = K.ADULT;
  const walk = [{ at: 5, to: 260 }];
  for (const f of [0, 12, 30, 60, 90]) assert.deepEqual(body(p, f, { walk }).pose, body(p, f, { walk, seed: 0 }).pose);
  assert.deepEqual(K.feetPlanOf(IDLE, undefined, walk, FPS, p), K.feetPlanOf(IDLE, undefined, walk, FPS, p, 0));
  const still = body(p, 30, {}).lower;
  assert.equal(still.walk, 0);
  assert.equal(still.twist ?? 0, 0);
});

test("skirt: Bottom flares and swings with the walk, unchanged by default", () => {
  const h = K.createElement;
  const p = K.ADULT;
  const bottom = { kind: "skirt", color: "#234", shade: "#123" };
  const svg = (o) => K.renderToStaticMarkup(h("svg", {}, h(K.Bottom, { p, bottom, sway: 0, ...o })));
  assert.equal(svg({}), svg({ stride: 0, swing: 0 }));
  assert.notEqual(svg({ stride: 0.8 }), svg({}));
  assert.notEqual(svg({ swing: 0.5 }), svg({ swing: -0.5 }));
  const walk = [{ at: 5, to: 400 }];
  const tl = range(15, 45).map((f) => body(p, f, { walk }).lower.twistLag ?? 0);
  assert.ok(Math.max(...tl) > 0.2 && Math.min(...tl) < -0.2, "the pelvis twist (skirt swing) alternates");
});
