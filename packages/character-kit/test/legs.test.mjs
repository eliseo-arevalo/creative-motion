// Legs, feet, walk and torso tests (v6): npm test
import { build } from "esbuild";
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outfile = join(mkdtempSync(join(tmpdir(), "ck-legs-")), "kit.mjs");
await build({ entryPoints: [join(here, "..", "src", "index.ts")], bundle: true, platform: "node", format: "esm", outfile, logLevel: "error", jsx: "automatic" });
const K = await import(pathToFileURL(outfile).href);

const FPS = 30;
const RIGS = { adult: K.ADULT, child: K.CHILD };
const IDLE = [{ at: 0, clip: "idle" }];
const body = (p, keys, f, opts = {}) => K.evaluateBody(keys, f, FPS, p, opts);
const sub = (a, b) => ({ x: a.x - b.x, u: a.u - b.u, z: a.z - b.z });
const dot = (a, b) => a.x * b.x + a.u * b.u + a.z * b.z;
const len = (a) => Math.sqrt(dot(a, a));

/** The point a planted foot pivots on: the heel when the toe is up, else the ball. */
const pivot = (p, foot, heel) => {
  const f = K.footOf(p);
  return K.footPoint(p, foot.ankle, foot.pitch, foot.yaw, 0, heel ? -f.heel : f.ball, 0);
};

/** Shots that exercise the legs: every clip from idle, walks both ways (also in place), turns, weight shifts, stance changes. */
const SHOTS = [
  ...Object.keys(K.CLIPS).map((c) => ({ name: `idle→${c}`, keys: [{ at: 0, clip: "idle" }, { at: 10, clip: c }], frames: 100 })),
  { name: "walk right", keys: IDLE, walk: [{ at: 5, to: 260 }], frames: 90 },
  { name: "walk left + back", keys: IDLE, walk: [{ at: 5, to: -200 }, { at: 60, to: 40 }], frames: 140 },
  { name: "walk in place", keys: IDLE, walk: [{ at: 5, to: 400, inPlace: true }], frames: 90 },
  { name: "walk no face", keys: IDLE, walk: [{ at: 5, to: 180, face: false }], frames: 70 },
  { name: "turn", keys: IDLE, turn: [{ at: 10, yaw: 1 }, { at: 50, yaw: -1 }, { at: 90, yaw: 0 }], frames: 130 },
  { name: "weight", keys: [{ at: 0, pose: K.REST }, { at: 10, pose: { ...K.REST, weight: 1 } }, { at: 45, pose: { ...K.REST, weight: -1 } }], frames: 90 },
  { name: "stance", keys: [{ at: 0, pose: K.REST }, { at: 15, pose: { ...K.REST, legL: 9, legR: 9 } }], frames: 60 },
];

for (const [rn, p] of Object.entries(RIGS)) {
  test(`${rn}: planted feet never slide, knees only bend forward, legs never stretch, soles never below the ground`, () => {
    const L = K.legLength(p);
    const bad = [];
    for (const s of SHOTS) {
      let prev;
      for (let f = 0; f <= s.frames; f++) {
        const b = body(p, s.keys, f, { turn: s.turn, walk: s.walk });
        const lo = b.lower;
        for (const k of ["L", "R"]) {
          const leg = lo[k];
          // Knee on the foot's forward side of the hip–ankle line (never backward).
          const F = { x: Math.sin((leg.foot.yaw * Math.PI) / 180), u: 0, z: Math.cos((leg.foot.yaw * Math.PI) / 180) };
          const ax = sub(leg.ankle3, leg.hip3);
          const al = len(ax);
          const kh = sub(leg.knee3, leg.hip3);
          const along = dot(kh, ax) / al;
          const off = { x: kh.x - (ax.x * along) / al, u: kh.u - (ax.u * along) / al, z: kh.z - (ax.z * along) / al };
          if (dot(off, F) < -0.01) bad.push(`${s.name} f${f} ${k} knee-backward`);
          if (Math.abs(len(sub(leg.knee3, leg.hip3)) - p.thigh) > 0.01 || Math.abs(len(sub(leg.ankle3, leg.knee3)) - p.shin) > 0.6) bad.push(`${s.name} f${f} ${k} bone-length`);
          if (al > L * K.LEGS.reach + 0.5) bad.push(`${s.name} f${f} ${k} stretch ${al.toFixed(1)}`);
          const fd = K.footOf(p);
          for (const [a, bb] of [[0, -fd.heel], [0, fd.ball], [0, fd.toe], [fd.width / 2, fd.ball], [-fd.width / 2, fd.ball]]) {
            const q = K.footPoint(p, leg.foot.ankle, leg.foot.pitch, leg.foot.yaw, a, bb, 0);
            if (q.u < -0.5) bad.push(`${s.name} f${f} ${k} below-ground ${q.u.toFixed(1)}`);
          }
          // Foot lock: a foot on the ground (this frame and the last, same plant) keeps its pivot.
          const was = prev?.[k];
          if (was && !leg.foot.swinging && !was.foot.swinging && leg.foot.contact >= 1 && was.foot.contact >= 1 && JSON.stringify(leg.foot.plant) === JSON.stringify(was.foot.plant)) {
            const heel = leg.foot.pitch > 0.01 || was.foot.pitch > 0.01;
            const d = len(sub(pivot(p, leg.foot, heel), pivot(p, was.foot, heel)));
            if (d > 0.5) bad.push(`${s.name} f${f} ${k} slide ${d.toFixed(2)}px`);
          }
        }
        prev = lo;
      }
    }
    assert.deepEqual(bad.slice(0, 20), []);
  });

  test(`${rn}: walk gait — heel strike, toe off, one foot always down, hips low at contact / high at passing, arrives`, () => {
    const walk = [{ at: 10, to: 300 }];
    const plan = K.feetPlanOf(IDLE, undefined, walk, FPS, p);
    const seg = plan.segs[0];
    assert.ok(seg.n >= 2);
    const swings = [...plan.L.swings, ...plan.R.swings].filter((s) => s.walk).sort((a, b) => a.t0 - b.t0);
    assert.equal(swings.length, seg.n + 1, "n steps + the closing step");
    // Alternating feet, never both in the air.
    for (let f = 0; f < seg.end + 20; f++) {
      const b = body(p, IDLE, f, { walk });
      assert.ok(!(b.lower.L.foot.swinging && b.lower.R.foot.swinging), `both feet up at f${f}`);
    }
    // Landing on the heel (toe up), leaving from the toe (heel up).
    for (const s of swings) {
      const land = body(p, IDLE, s.t1, { walk });
      const leave = body(p, IDLE, s.t0, { walk });
      const k = plan.L.swings.includes(s) ? "L" : "R";
      assert.ok(land.lower[k].foot.pitch > 5, `heel strike pitch ${land.lower[k].foot.pitch}`);
      if (s !== swings[0]) assert.ok(leave.lower[k].foot.pitch < -15, `toe off pitch ${leave.lower[k].foot.pitch}`);
    }
    // Hips: lowest just after a heel strike (double support), highest at passing (mid-swing).
    const mid = swings[1];
    const hy = (f) => body(p, IDLE, f, { walk }).lower.hip.y;
    const contact = Math.max(hy(mid.t1), hy(mid.t1 + 2), hy(mid.t1 + 4));
    const passing = Math.min(hy(Math.round((mid.t0 + mid.t1) / 2)), hy(Math.round((mid.t0 + mid.t1) / 2) + 1));
    assert.ok(contact - passing > K.legLength(p) * 0.006, `hip bob ${(contact - passing).toFixed(1)}px`);
    // Arrives where asked, standing (feet planted either side, flat), facing front again.
    const end = body(p, IDLE, seg.end + 40, { walk });
    assert.ok(Math.abs(end.pose.x - 300) < 8, `arrived x ${end.pose.x}`);
    assert.ok(!end.lower.L.foot.swinging && !end.lower.R.foot.swinging);
    assert.ok(Math.abs(end.yawB) < 0.05, "turns back to the camera");
    // Walking turns the body toward where it goes.
    assert.ok(body(p, IDLE, seg.t0 + 15, { walk }).yawB > 0.6);
  });

  test(`${rn}: walking arms swing against the legs; the far arm never sweeps over the torso`, () => {
    const walk = [{ at: 5, to: 300 }];
    let opposite = 0;
    let samples = 0;
    for (let f = 20; f < 45; f++) {
      const b = body(p, IDLE, f, { walk });
      const lo = b.lower;
      if (Math.abs(lo.swingL) > 0.3) {
        samples++;
        // The left arm swings forward when the right foot is forward.
        const rFwd = lo.R.foot.ankle.x - lo.L.foot.ankle.x;
        if (Math.sign(lo.swingL) === Math.sign(rFwd) || Math.abs(rFwd) < 20) opposite++;
      }
      // Far arm (screen-right when facing right): its hand stays outside the torso outline.
      const a = b.pose.armR;
      const pts = K.armPoints(p.upperArm * (a.upper ?? 1), p.foreArm * (a.fore ?? 1), a.shoulder, a.elbow);
      const s = K.shoulderAt(p, 1, b.pose.shrug);
      assert.ok(s.x + pts.wrist.u > p.waistHalf - 2, `far wrist inside the torso at f${f}`);
    }
    assert.ok(samples > 5 && opposite / samples > 0.8, `${opposite}/${samples}`);
  });

  test(`${rn}: contrapposto — hips over the weighted foot, that hip up, shoulders the other way`, () => {
    for (const w of [1, -1]) {
      const b = body(p, [{ at: 0, pose: { ...K.REST, weight: w } }], 20);
      assert.ok(Math.sign(b.pose.x) === w && Math.abs(b.pose.x) > p.legGap * 0.5, "hips slide over the foot");
      assert.ok(Math.sign(b.lower.pelvis) === -w && Math.abs(b.lower.pelvis) > 2, "weighted hip up");
      assert.ok(Math.sign(b.pose.torso) === w, "shoulders tilt the other way");
      const loaded = w > 0 ? b.lower.R : b.lower.L;
      const free = w > 0 ? b.lower.L : b.lower.R;
      assert.ok(free.bend > loaded.bend + 3, "the free knee relaxes");
    }
  });

  test(`${rn}: 3/4 — feet turn with the body and stagger in depth (near foot lower on screen)`, () => {
    const turn = [{ at: 0, yaw: 1 }];
    const b = body(p, IDLE, 40, { turn });
    const { L, R } = b.lower;
    assert.ok(L.foot.yaw > 20 && R.foot.yaw > 20, "toes point the way the body faces");
    assert.ok(L.ankle3.z > R.ankle3.z + 20, "near (screen-left) foot nearer the camera");
    assert.ok(L.ankle.y > R.ankle.y + 5, "near foot lower on screen");
    // Turning steps the feet round (no sliding: checked above) and ends standing.
    const plan = K.feetPlanOf(IDLE, [{ at: 0, yaw: 0 }, { at: 10, yaw: 1 }], undefined, FPS, p);
    assert.ok(plan.L.swings.length + plan.R.swings.length >= 2, "pivot steps");
  });

  test(`${rn}: in place — a parent moved by walkOffset keeps the feet locked to the world`, () => {
    const walk = [{ at: 5, to: 300, inPlace: true }];
    let last;
    for (let f = 0; f < 70; f++) {
      const b = body(p, IDLE, f, { walk });
      assert.ok(Math.abs(b.pose.x) < 8, "stays at its place on the canvas");
      const off = K.walkOffset(walk, f, FPS, p);
      const lo = b.lower;
      for (const k of ["L", "R"]) {
        const ft = lo[k].foot;
        const was = last?.[k];
        if (was && !ft.swinging && !was.ft.swinging && ft.contact >= 1 && was.ft.contact >= 1 && ft.pitch === 0 && was.ft.pitch === 0) assert.ok(Math.abs(ft.ankle.x + off - (was.ft.ankle.x + was.off)) < 0.5, `foot ${k} slides in the world at f${f}`);
      }
      last = { L: { ft: lo.L.foot, off }, R: { ft: lo.R.foot, off } };
    }
  });
}

test("back-compat: poses without weight stay weight-free; Leg and evaluatePose keep their API", () => {
  const p = K.ADULT;
  const b = K.blendPose(K.REST, K.REST, 0.5);
  assert.equal("weight" in b, false);
  assert.equal("weight" in K.addDelta(K.REST, { x: 1 }), false);
  assert.equal(typeof K.evaluatePose([{ at: 0, clip: "wave" }], 20, FPS, p).pose.armR.shoulder, "number");
  // No walk, no turn: feet stand where the old rig put them, legs straight under the hips.
  const lo = K.evaluateBody([{ at: 0, pose: K.REST }], 10, FPS, p).lower;
  assert.ok(lo.L.bend < 10 && lo.R.bend < 10);
  assert.ok(Math.abs(lo.L.ankle.x - (400 - p.legGap - Math.sin((2 * Math.PI) / 180) * K.legLength(p))) < 1);
});

test("torso: follow-through from a fast arm swing stays small; walking squash a few % at most", () => {
  const p = K.ADULT;
  let mx = 0;
  for (let f = 0; f < 60; f++) {
    const a = K.evaluatePose([{ at: 0, clip: "idle" }, { at: 10, clip: "celebrate" }], f, FPS, p).pose.torso;
    const r = K.evaluatePose([{ at: 0, clip: "idle" }], f, FPS, p).pose.torso;
    mx = Math.max(mx, Math.abs(a - r));
  }
  assert.ok(mx > 0.2 && mx < 8, `torso reaction ${mx}`);
  for (let f = 0; f < 60; f++) assert.ok(K.evaluateBody([{ at: 0, clip: "idle" }], f, FPS, p, { walk: [{ at: 5, to: 300 }] }).squash <= 0.012);
});
