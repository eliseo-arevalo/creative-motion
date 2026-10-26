// Feature tests for hands (roll), phone grip / tap, and the new gestures: npm test
import { build } from "esbuild";
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outfile = join(mkdtempSync(join(tmpdir(), "ck-feat-")), "kit.mjs");
await build({ entryPoints: [join(here, "..", "src", "index.ts")], bundle: true, platform: "node", format: "esm", outfile, logLevel: "error", jsx: "automatic" });
const K = await import(pathToFileURL(outfile).href);

const FPS = 30;
const SPECS = { adult: K.DEMO_CHARACTER, child: { ...K.DEMO_CHARACTER, proportions: K.CHILD } };
const at = (spec, keys, f) => K.forward(spec, K.evaluatePose(keys, f, FPS, spec.proportions).pose);
const pose = (spec, keys, f) => K.evaluatePose(keys, f, FPS, spec.proportions).pose;
const track = (clip) => [{ at: 0, clip: "idle" }, { at: 30, clip }];
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

test("handRoll: no roll is the identity", () => {
  for (const shape of Object.keys(K.NATIVE_ROLL)) assert.deepEqual(K.handRoll(shape, undefined, undefined, undefined), { sx: 1, view: 1, flipped: false, native: K.NATIVE_ROLL[shape] });
});

test("handRoll: a flat hand narrows through the edge and flips there, width continuous", () => {
  for (const shape of ["open", "flat", "point", "hold"]) {
    const n = K.NATIVE_ROLL[shape];
    let prev = K.handRoll(shape, undefined, 1, n);
    let flips = 0;
    let minW = Infinity;
    for (let r = n + 1; r <= n + 180; r++) {
      const cur = K.handRoll(shape, undefined, 1, r);
      assert.ok(Math.abs(Math.abs(cur.sx) - Math.abs(prev.sx)) < 0.03, `${shape} width jump at roll ${r}`);
      if (Math.sign(cur.sx) !== Math.sign(prev.sx)) {
        flips++;
        assert.ok(Math.abs(cur.sx) < 0.35 && Math.abs(prev.sx) < 0.35, `${shape} flips only when edge-on`);
      }
      minW = Math.min(minW, Math.abs(cur.sx));
      prev = cur;
    }
    assert.equal(flips, 1, `${shape}: one flip over half a turn`);
    assert.ok(minW >= 0.29 && minW <= 0.32, `${shape}: narrowest ~30 %`);
    assert.ok(Math.abs(K.handRoll(shape, undefined, 1, n + 180).sx + 1) < 1e-9, `${shape}: other face at 180°`);
  }
  // Edge-on drawings never flip.
  for (let r = 0; r <= 360; r += 5) assert.ok(K.handRoll("relaxed", undefined, 1, r).sx > 0.7);
  assert.equal(K.FACE_ROLL.palm, 0);
  assert.equal(K.FACE_ROLL.edge, 90);
  assert.equal(K.FACE_ROLL.back, 180);
});

test("handRoll: a shape change blends the native side (no pop)", () => {
  let prev = K.handRoll("open", "point", 0, 90).sx;
  for (let m = 0.05; m <= 1.0001; m += 0.05) {
    const cur = K.handRoll("open", "point", m, 90).sx;
    assert.ok(Math.abs(Math.abs(cur) - Math.abs(prev)) < 0.12, `mix ${m.toFixed(2)}`);
    prev = cur;
  }
});

test("phone: looking at it shows the back to the camera; showing it shows the screen", () => {
  for (const spec of Object.values(SPECS)) {
    for (const f of [60, 75, 100]) {
      const look = pose(spec, track("phoneTap"), f).armR;
      const show = pose(spec, track("phoneTapShow"), f).armL;
      assert.ok(K.handRoll(look.hand, look.handFrom, look.handMix, look.roll).view < -0.3, `phoneTap f${f}: screen toward the character`);
      assert.ok(K.handRoll(show.hand, show.handFrom, show.handMix, show.roll).view > 0.8, `phoneTapShow f${f}: screen to camera`);
    }
  }
});

test("phone tap: approach, contact on the phone, rebound", () => {
  // Curve: hover → contact for 2 frames → lift with a small overshoot past the hover point.
  const T = 40;
  assert.equal(K.tapCurve(T - 8, T), 0);
  assert.ok(Math.abs(K.tapCurve(T, T) - 1) < 1e-9);
  assert.ok(Math.abs(K.tapCurve(T + 2, T) - 1) < 1e-9);
  const after = [...Array(12).keys()].map((i) => K.tapCurve(T + 3 + i, T));
  assert.ok(Math.min(...after) < -0.05, "rebound past the hover point");
  assert.ok(Math.abs(K.tapCurve(T + 20, T)) < 1e-6, "settles");
  assert.ok(K.tapRecoil(T - 2, T) === 0 && K.tapRecoil(T + 1, T) > 0.3, "phone dips at contact");
  // Rendered: the index tip lands on the phone at each contact and lifts off between taps.
  const TIP = [16, 80]; // index fingertip of the "point" hand model
  const SLOT = [0, 46]; // centre of the held phone
  for (const spec of Object.values(SPECS))
    for (const [clip, tapper, phone] of [["phoneTap", "armL", "armR"], ["phoneTapShow", "armR", "armL"]])
      for (const [i, c] of K.PHONE_TAPS.entries()) {
        const d = (g) => {
          const F = at(spec, track(clip), g);
          return dist(F[tapper].point(...TIP), F[phone].point(...SLOT));
        };
        const h = spec.proportions.hand;
        const contact = Math.min(...[-2, -1, 0, 1].map((k) => d(30 + c + k)));
        const lifted = Math.max(...[3, 4, 5, 6, 7, 8, 9].map((k) => d(30 + c + k)));
        assert.ok(contact < 0.6 * h, `${clip} tap ${c}: fingertip on the phone (${contact.toFixed(1)}px)`);
        // A quick double tap (8 frames apart) barely lifts; the others lift clearly.
        // (The first tap lands as the arm arrives: the arrival is its approach.)
        if (i === 0) continue;
        const next = K.PHONE_TAPS[i + 1];
        const double = (next !== undefined && next - c < 10) || c - K.PHONE_TAPS[i - 1] < 10;
        const lift = double ? 0.035 : 0.07;
        assert.ok(lifted - contact > lift * h, `${clip} tap ${c}: lifts off (${contact.toFixed(1)} → ${lifted.toFixed(1)})`);
      }
});

test("crossed arms: both forearms cross the midline", () => {
  for (const [name, spec] of Object.entries(SPECS))
    for (const clip of ["crossedArms", "refuse"]) {
      const F = at(spec, track(clip), 100);
      const cx = K.CANVAS.centerX;
      assert.ok(F.armL.grip.x > cx && F.armR.grip.x < cx, `${name} ${clip}: L ${F.armL.grip.x.toFixed(0)} R ${F.armR.grip.x.toFixed(0)} vs ${cx}`);
      assert.ok(Math.abs(F.armL.grip.y - F.armR.grip.y) < spec.proportions.hand * 1.2, `${name} ${clip}: hands at about the same height`);
    }
});

test("finger wag: the pointing hand swings side to side, ~3 per second", () => {
  for (const spec of Object.values(SPECS)) {
    const angs = [];
    for (let f = 50; f <= 110; f++) angs.push(at(spec, track("wagNo"), f).armR.worldAngle);
    const mean = angs.reduce((s, a) => s + a, 0) / angs.length;
    let crossings = 0;
    for (let i = 1; i < angs.length; i++) if (Math.sign(angs[i] - mean) !== Math.sign(angs[i - 1] - mean)) crossings++;
    assert.ok(crossings >= 8 && crossings <= 16, `crossings ${crossings}`);
    assert.ok(Math.max(...angs) - Math.min(...angs) > 25, "visible swing");
    const p = pose(spec, track("wagNo"), 80).armR;
    assert.equal(p.hand, "point");
  }
});

test("handshake: grips meet at the same height and the pumps are in sync", () => {
  const pairs = [[SPECS.adult, SPECS.child], [SPECS.adult, SPECS.adult], [SPECS.child, SPECS.adult]];
  for (const [a, b] of pairs) {
    const hs = K.shakeHands(a, b);
    assert.ok(hs.gap > 0, "gap between centres");
    assert.equal(K.handshakeGap(a, b), hs.gap);
    const cx = K.CANVAS.centerX;
    const ka = [{ at: 0, clip: "idle" }, { at: 30, clip: hs.a }];
    const kb = [{ at: 0, clip: "idle" }, { at: 30, clip: hs.b }];
    const ys = { a: [], b: [] };
    for (let f = 70; f <= 150; f += 2) {
      const ga = at(a, ka, f).armR.point(2, 40);
      const gb = at(b, kb, f).armR.point(2, 40);
      ys.a.push(ga.y);
      ys.b.push(gb.y);
      // b is mirrored and placed `gap` to the right: its grip lands at 2·cx + gap − gb.x … in a's frame.
      const bx = cx + hs.gap - (gb.x - cx);
      assert.ok(Math.abs(ga.x - bx) < 6, `f${f}: hands meet in x (${ga.x.toFixed(1)} vs ${bx.toFixed(1)})`);
      assert.ok(Math.abs(ga.y - gb.y) < 6, `f${f}: hands meet in y (${ga.y.toFixed(1)} vs ${gb.y.toFixed(1)})`);
    }
    const m = (v) => v.reduce((s, x) => s + x, 0) / v.length;
    const ma = m(ys.a), mb = m(ys.b);
    let num = 0, da = 0, db = 0;
    for (let i = 0; i < ys.a.length; i++) { num += (ys.a[i] - ma) * (ys.b[i] - mb); da += (ys.a[i] - ma) ** 2; db += (ys.b[i] - mb) ** 2; }
    assert.ok(Math.sqrt(da) > 5, "pumps move the grip");
    assert.ok(num / Math.sqrt(da * db) > 0.9, "pumps in phase");
  }
});

test("backward compatible: a pose without roll / face draws as before", () => {
  const p = K.POSES.rest;
  assert.equal(p.armL.roll, undefined);
  const F = K.forward(K.DEMO_CHARACTER, K.resolvePose(K.ADULT, p));
  assert.ok(Number.isFinite(F.armL.grip.x) && Number.isFinite(F.armR.point(0, 0).x));
});

// ---- Stage 5: wrist joint, wave from the elbow, face gestures with the elbow out, hand faces ----

/** Elbow distance outside the torso silhouette (px, > 0 outside), in torso space. */
const torsoOut = (spec, q, E) => {
  const p = spec.proportions;
  const rx = E.x - K.CANVAS.centerX - q.x;
  const ry = E.y - K.hipY(p) - q.y;
  const c = Math.cos((-q.lean * Math.PI) / 180);
  const s = Math.sin((-q.lean * Math.PI) / 180);
  const x = c * rx - s * ry;
  const y = s * rx + c * ry;
  const top = -p.torso + p.shoulderDrop;
  const t = Math.min(1, Math.max(0, (y - top) / -top));
  return Math.abs(x) - (p.shoulderHalf + (p.waistHalf - p.shoulderHalf) * t);
};

test("wrist joint: the skin runs on from the forearm to the palm for every roll and mirror (no break, no bulge)", () => {
  for (const shape of Object.keys(K.HAND_MODELS))
    for (const mirror of [0, 0.5, 1])
      for (const w of [20, K.defaultWristWidth(82), 34]) {
        let prev;
        for (let r = 0; r <= 360; r += 5) {
          const { sx } = K.handRoll(shape, undefined, 1, r, mirror);
          const J = K.wristJoint(K.HAND_MODELS[shape].palm, sx, w);
          const tag = `${shape} roll ${r} mirror ${mirror} w ${w.toFixed(0)}`;
          // The palm top is never wider than the forearm it continues.
          assert.ok(J.palmTopHalf <= J.fh + 1e-6, `${tag}: palm top ${J.palmTopHalf.toFixed(1)} > wrist ${J.fh.toFixed(1)}`);
          // The bridge starts at the forearm's width and meets the palm outline at WRIST_JOIN.
          const b0 = J.bridgeAt(0);
          const b1 = J.bridgeAt(1);
          assert.ok(Math.abs(b0.right - J.fh) < 1e-6 && Math.abs(b0.left + J.fh) < 1e-6, `${tag}: bridge top`);
          assert.ok(Math.abs(b1.y - K.WRIST_JOIN) < 1e-6 && Math.abs(b1.right - J.join.hi) < 1e-6 && Math.abs(b1.left - J.join.lo) < 1e-6, `${tag}: join`);
          assert.ok(Math.abs(J.sideL[0][1] - K.WRIST_JOIN) < 0.05 && Math.abs(J.sideR[0][1] - K.WRIST_JOIN) < 0.05, `${tag}: palm sides start at the join`);
          // No bulge: the outline stays between its two ends (monotone width).
          for (let t = 0; t <= 1; t += 0.05) {
            const b = J.bridgeAt(t);
            assert.ok(b.right <= Math.max(J.fh, J.join.hi) + 0.01 && b.left >= Math.min(-J.fh, J.join.lo) - 0.01, `${tag}: bulge at ${t.toFixed(2)}`);
          }
          // Continuous over the roll: no jump in the join width.
          if (prev) assert.ok(Math.abs(J.join.hi - J.join.lo - prev) < 4, `${tag}: join width jump ${prev.toFixed(1)} → ${(J.join.hi - J.join.lo).toFixed(1)}`);
          prev = J.join.hi - J.join.lo;
        }
      }
});

test("wave: the swing comes from the elbow, wrist nearly straight and smooth, palm to camera", () => {
  for (const [name, spec] of Object.entries(SPECS)) {
    const keys = track("wave");
    let prev;
    let maxStep = 0;
    const el = [];
    for (let f = 60; f <= 150; f++) {
      const a = pose(spec, keys, f).armR;
      assert.ok(Math.abs(a.wrist) <= 12, `${name} f${f}: wrist bent ${a.wrist.toFixed(1)}°`);
      assert.equal(K.handFaceOf(a.hand, a.roll), "palm", `${name} f${f}: palm to camera`);
      if (prev !== undefined) maxStep = Math.max(maxStep, Math.abs(a.wrist - prev));
      prev = a.wrist;
      el.push(a.elbow);
    }
    assert.ok(Math.max(...el) - Math.min(...el) >= 30, `${name}: elbow swing ${(Math.max(...el) - Math.min(...el)).toFixed(0)}°`);
    assert.ok(maxStep <= 5, `${name}: wrist flick ${maxStep.toFixed(1)}°/frame`);
    // Raising the arm: the hand follows through without a snap at the wrist.
    let prevR;
    for (let f = 30; f <= 60; f++) {
      const w = pose(spec, keys, f).armR.wrist;
      if (prevR !== undefined) assert.ok(Math.abs(w - prevR) <= 25, `${name} f${f}: wrist snap ${prevR.toFixed(0)} → ${w.toFixed(0)}`);
      prevR = w;
    }
  }
});

test("face gestures: the elbow is never inside the torso (cheek, scratch, phone at the ear)", () => {
  for (const [name, spec] of Object.entries(SPECS))
    for (const [clip, from, frames, min] of [
      ["cheek", 30, [70, 90, 120], 10],
      ["scratch", 30, [70, 90], 0],
      ["phone", 30, [70, 90], 10],
      // At the ear (it starts with the phone out of the pocket, elbow back at the side; the swing up
      // to the ear goes through "elbow to camera").
      ["answerPhone", 75, [75, 90, 105], 10],
    ]) {
      // Arriving and settled.
      // (Child proportions: the cheek's outside elbow is the other fold, reached through "elbow to
      // camera"; checked settled only.)
      for (let f = name === "child" ? Math.min(...frames) : from; f <= Math.max(...frames); f += f < from + 30 ? 2 : 10) {
        const q = pose(spec, track(clip), f);
        const out = torsoOut(spec, q, K.forward(spec, q).armR.elbow);
        assert.ok(out > (frames.includes(f) || f >= 70 ? min : -2), `${name} ${clip} f${f}: elbow ${out.toFixed(0)}px inside the torso`);
      }
    }
});

test("cheek: forearm nearly upright, elbow below the hand, back of the hand to camera", () => {
  for (const [name, spec] of Object.entries(SPECS)) {
    const q = pose(spec, track("cheek"), 90);
    const j = K.forward(spec, q).armR;
    const lean = (Math.atan2(Math.abs(j.elbow.x - j.wrist.x), j.elbow.y - j.wrist.y) * 180) / Math.PI;
    assert.ok(j.elbow.y > j.wrist.y && lean < 40, `${name}: forearm ${lean.toFixed(0)}° off vertical`);
    assert.equal(K.handFaceOf(q.armR.hand, q.armR.roll), "back", `${name}: back of the hand`);
    assert.ok(Math.abs(q.armR.wrist) < 30, `${name}: wrist ${q.armR.wrist.toFixed(0)}°`);
  }
});

test("think: the elbow in front of the chest is propped on the other hand", () => {
  for (const [name, spec] of Object.entries(SPECS)) {
    const j = at(spec, track("think"), 90);
    assert.ok(dist(j.armR.elbow, j.armL.grip) < spec.proportions.hand * 0.45, `${name}: elbow ${dist(j.armR.elbow, j.armL.grip).toFixed(0)}px from the propping hand`);
  }
});

test("hand faces: every clip shows the expected side of each hand", () => {
  // [clip, armL, armR]: palm / back / edge, "native" (no roll: the drawing as is).
  const EXPECT = [
    ["wave", "native", "palm"],
    ["point", "native", "back"],
    ["think", "back", "native"],
    ["scratch", "native", "back"],
    ["phone", "native", "back"],
    ["answerPhone", "native", "back"],
    ["pointPhone", "palm", "back"],
    ["phoneTapShow", "palm", "back"],
    ["phoneTap", "back", "edge"],
    ["cheek", "native", "back"],
    ["crossedArms", "back", "back"],
    ["wagNo", "native", "palm"],
    ["handshake", "native", "edge"],
  ];
  const faceOf = (a) => (a.roll === undefined ? "native" : K.handFaceOf(a.hand, a.roll));
  for (const [name, spec] of Object.entries(SPECS))
    for (const [clip, l, r] of EXPECT) {
      const q = pose(spec, track(clip), 100);
      assert.equal(faceOf(q.armL), l, `${name} ${clip} armL`);
      assert.equal(faceOf(q.armR), r, `${name} ${clip} armR`);
    }
});

test("phone: the hand pointing at a shown phone turns its palm to the body (mirrored back view, index on top)", () => {
  for (const [name, spec] of Object.entries(SPECS))
    for (const clip of ["pointPhone", "phoneTapShow"]) {
      const q = pose(spec, track(clip), 100);
      assert.ok((q.armR.mirror ?? 0) > 0.99, `${name} ${clip}: mirrored`);
      const r = K.handRoll(q.armR.hand, undefined, 1, q.armR.roll, q.armR.mirror);
      // The point drawing is a back view (native 180): mirrored, its index edge goes on top.
      assert.equal(K.handFaceOf(q.armR.hand, q.armR.roll), "back", `${name} ${clip}: back to camera`);
      assert.ok(r.sx < -0.99, `${name} ${clip}: back view drawn mirrored (sx ${r.sx.toFixed(2)})`);
      // The holding hand shows its palm (the phone is held facing the viewer).
      assert.equal(K.handFaceOf(q.armL.hand, q.armL.roll), "palm", `${name} ${clip}: holding hand`);
    }
});

test("point: unchanged (roll 140, not mirrored)", () => {
  assert.equal(K.POSES.point.armR.roll, 140);
  assert.equal(K.POSES.point.armR.mirror, undefined);
  for (const spec of Object.values(SPECS)) assert.equal(pose(spec, track("point"), 100).armR.mirror, undefined);
});
