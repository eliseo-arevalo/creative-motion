/**
 * Frame-by-frame rig checks (run by rig.test.mjs). Samples every clip transition and reports:
 * joint limits, inverted elbows, stretched arms, hands / forearms inside the head oval outside
 * an intended contact, wrist pops between frames and arm layer flicker.
 */
import { ARM_LIMITS, CLIPS, HEAD_ANCHORS, anchorPoint, armFrontAt, armPoints, clipOf, defaultPole, elbowSide, evaluatePose, headOval, shoulderAt, ADULT, CHILD } from "../src";
import type { Clip, Pose, PoseKey, Proportions } from "../src";

export type Violation = { track: string; frame: number; side: "L" | "R"; rule: string; detail: string };

const FPS = 30;
const rad = (d: number) => (d * Math.PI) / 180;

const insideHead = (p: Proportions, b: Pose, x: number, y: number, shrink: number) => {
  const o = headOval(p, b);
  const r = rad(-o.rot);
  const dx = x - o.c.x;
  const dy = y - o.c.y;
  const qx = dx * Math.cos(r) - dy * Math.sin(r);
  const qy = dx * Math.sin(r) + dy * Math.cos(r);
  return (qx / (o.rx * shrink)) ** 2 + (qy / (o.ry * shrink)) ** 2 < 1;
};

/** Expanded key poses (track keys + clip steps), as the timeline sees them. */
const expanded = (keys: PoseKey[]) => {
  const out: { at: number; pose: Pose }[] = [];
  keys.forEach((k, i) => {
    const c: Clip = clipOf(k);
    const next = keys[i + 1]?.at ?? Infinity;
    out.push({ at: k.at, pose: c.pose });
    for (const st of c.steps ?? []) if (k.at + st.at < next) out.push({ at: k.at + st.at, pose: st.pose });
  });
  return out;
};

export const checkTrack = (name: string, keys: PoseKey[], frames: number, p: Proportions): Violation[] => {
  const out: Violation[] = [];
  const ex = expanded(keys);
  const path: Record<string, { x: number; y: number }[]> = { L: [], R: [] };
  const elb: Record<string, number[]> = { L: [], R: [] };
  const elbP: Record<string, { x: number; y: number }[]> = { L: [], R: [] };
  const front: Record<string, number[]> = { L: [], R: [] };
  for (let f = 0; f <= frames; f++) {
    const { pose } = evaluatePose(keys, f, FPS, p);
    const ai = ex.reduce((acc, k, i) => (k.at <= f ? i : acc), 0);
    for (const side of [-1, 1] as const) {
      const S = side < 0 ? "L" : "R";
      const a = side < 0 ? pose.armL : pose.armR;
      const v = (rule: string, detail: string) => out.push({ track: name, frame: f, side: S, rule, detail });
      const l1 = p.upperArm * (a.upper ?? 1);
      const l2 = p.foreArm * (a.fore ?? 1);
      // Joint limits.
      if (!(a.bendSign !== undefined && Math.abs(a.bendSign) < 0.999) && (a.shoulder < ARM_LIMITS.shoulder[0] - 0.01 || a.shoulder > ARM_LIMITS.shoulder[1] + 0.01)) v("shoulder-range", a.shoulder.toFixed(1));
      if (Math.abs(a.elbow) > ARM_LIMITS.elbowFlex + 0.01) v("elbow-range", a.elbow.toFixed(1));
      if (a.wrist < ARM_LIMITS.wrist[0] - 0.01 || a.wrist > ARM_LIMITS.wrist[1] + 0.01) v("wrist-range", a.wrist.toFixed(1));
      // Elbow never inverted: once a pose has settled, the elbow sits on its natural side (the key's
      // pole, or down / outward by default). In motion the fold direction is checked by elbow-flip.
      const settled = f - ex[ai].at >= 24;
      const pts = armPoints(l1, l2, a.shoulder, a.elbow);
      if (settled && Math.abs(a.elbow) > 25) {
        const keyPole = ex[ai].pose[side < 0 ? "armL" : "armR"].pole;
        const pole = keyPole ?? defaultPole(pts.wrist.u, pts.wrist.v);
        const sideOf = elbowSide(l1, l2, a.shoulder, a.elbow, pole);
        if (sideOf < -l1 * Math.sin(rad(ARM_LIMITS.hyper)) - 0.5) v("elbow-inverted", `${sideOf.toFixed(1)}px`);
      }
      // No stretch.
      if (Math.hypot(pts.wrist.u, pts.wrist.v) > l1 + l2 + 0.5) v("stretch", "");
      // Torso-space points.
      const s = shoulderAt(p, side, pose.shrug);
      const T = (u: number, w: number) => ({ x: s.x + side * u, y: s.y + w });
      const elbow = T(pts.elbow.u, pts.elbow.v);
      const wrist = T(pts.wrist.u, pts.wrist.v);
      const dir = rad(a.shoulder + a.elbow + a.wrist);
      const hand = (k: number) => T(pts.wrist.u + Math.sin(dir) * p.hand * k, pts.wrist.v + Math.cos(dir) * p.hand * k);
      // Contact: only near an anchor the current (or just-left) key reaches for.
      const anchors = [ai, f - ex[ai].at < 10 ? ai - 1 : -1]
        .filter((i) => i >= 0)
        .map((i) => ex[i].pose[side < 0 ? "armL" : "armR"].reach)
        .filter((r) => r && HEAD_ANCHORS.has(r.anchor))
        .map((r) => anchorPoint(p, side, r!, pose));
      const nearContact = (q: { x: number; y: number }) => anchors.some((c) => Math.hypot(q.x - c.x, q.y - c.y) < p.hand * 1.25);
      for (const [label, q] of [["hand", hand(0.45)], ["fingertips", hand(0.85)]] as const) {
        // Sliding from / to a head contact the hand may graze the edge of the face (oval at 0.82).
        const graze = anchors.length > 0 && f - ex[ai].at < 12 ? 0.82 : 0.92;
        if (insideHead(p, pose, q.x, q.y, graze) && !nearContact(q)) v("hand-in-head", label);
      }
      const mid = { x: (elbow.x + wrist.x) / 2, y: (elbow.y + wrist.y) / 2 };
      if (insideHead(p, pose, mid.x, mid.y, 0.85)) v("forearm-in-head", "");
      if (insideHead(p, pose, elbow.x, elbow.y, 0.95)) v("elbow-in-head", "");
      path[S].push(wrist);
      elb[S].push(a.elbow);
      elbP[S].push(elbow);
      front[S].push(armFrontAt(keys, f, FPS, p, side, side * 0.6));
    }
  }
  for (const S of ["L", "R"] as const) {
    // No pops: a frame whose wrist jump is far out of line with its neighbours (fast moves are fine).
    const P = path[S];
    const d = P.map((q, i) => (i === 0 ? 0 : Math.hypot(q.x - P[i - 1].x, q.y - P[i - 1].y)));
    for (let i = 1; i < d.length; i++) {
      const around = Math.max(d[i - 1], d[i + 1] ?? 0);
      if ((d[i] > 40 && d[i] > around * 2.2) || d[i] > (p.upperArm + p.foreArm) * 0.75) out.push({ track: name, frame: i, side: S, rule: "wrist-pop", detail: `${d[i].toFixed(0)}px (around ${around.toFixed(0)})` });
    }
    // No elbow flips: the elbow never snaps to the other side between two frames.
    const E = elb[S];
    const EP = elbP[S];
    const jump = (i: number) => Math.hypot(EP[i].x - EP[i - 1].x, EP[i].y - EP[i - 1].y);
    for (let i = 1; i < E.length; i++)
      if (Math.sign(E[i]) !== Math.sign(E[i - 1]) && Math.abs(E[i]) > 20 && Math.abs(E[i - 1]) > 20 && jump(i) > Math.max(1.5 * d[i], p.upperArm * 0.35)) out.push({ track: name, frame: i, side: S, rule: "elbow-flip", detail: `${E[i - 1].toFixed(0)}→${E[i].toFixed(0)} elbow ${jump(i).toFixed(0)}px, wrist ${d[i].toFixed(0)}px` });
    // Layer order: the front/behind weight never flips back and forth (flicker) within a few frames.
    const w = front[S];
    for (let i = 1; i < w.length; i++) {
      const up = w[i] - w[i - 1];
      if (Math.abs(up) < 0.25) continue;
      for (let j = i + 1; j < Math.min(w.length, i + 8); j++) {
        const back = w[j] - w[j - 1];
        if (Math.sign(back) === -Math.sign(up) && Math.abs(back) > 0.25) {
          out.push({ track: name, frame: i, side: S, rule: "layer-flicker", detail: `${w[i - 1].toFixed(2)}→${w[i].toFixed(2)}→…${w[j].toFixed(2)}` });
          break;
        }
      }
    }
  }
  return out;
};

/** Every clip after every clip, plus each multi-step clip played through, for adult and child. */
export const runAll = () => {
  const names = Object.keys(CLIPS);
  const out: Violation[] = [];
  let tracks = 0;
  for (const [pn, p] of [["adult", ADULT], ["child", CHILD]] as const) {
    for (const a of names)
      for (const b of names) {
        if (a === b) continue;
        tracks++;
        out.push(...checkTrack(`${pn}:${a}→${b}`, [{ at: 0, clip: a }, { at: 30, clip: b }], 110, p));
      }
    for (const a of names) {
      const c = (CLIPS as Record<string, Clip>)[a];
      const len = Math.max(90, ...(c.steps ?? []).map((s) => s.at + 50));
      tracks++;
      out.push(...checkTrack(`${pn}:idle→${a}(full)`, [{ at: 0, clip: "idle" }, { at: 10, clip: a }], len, p));
    }
  }
  return { tracks, violations: out };
};
