// Hair in 3/4: no bald spots (skin where the hair should be) for any hair kind at any turn: npm test
// Renders the head to SVG markup (react-dom/server) and rasterizes it with test/raster.mjs.
import { build } from "esbuild";
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { rasterize, shapesOf } from "./raster.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const outfile = join(mkdtempSync(join(tmpdir(), "ck-hair-")), "kit.cjs");
await build({
  stdin: { contents: `export * from "./src/index.ts"; export { renderToStaticMarkup } from "react-dom/server"; export { createElement } from "react";`, resolveDir: join(here, ".."), loader: "ts" },
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile,
  logLevel: "error",
  jsx: "automatic",
});
const K = (await import(pathToFileURL(outfile).href)).default;
const h = K.createElement;

const KINDS = ["short", "curly", "bob", "long", "ponytail", "bun", "lowBun"];
const YAWS = Array.from({ length: 23 }, (_, i) => Math.round((i / 10 - 1.1) * 10) / 10);
const RIGS = { adult: K.ADULT, child: K.CHILD };
const specOf = (kind, P, shape = "round") => ({ ...K.DEMO_CHARACTER, proportions: { ...K.DEMO_CHARACTER.proportions, ...P }, head: { ...K.DEMO_CHARACTER.head, shape }, hair: { ...K.DEMO_CHARACTER.hair, kind } });

const headImage = (spec, yaw) => {
  const p = spec.proportions;
  const state = { face: K.NEUTRAL, blink: 0, look: { px: 0, py: 0, turn: 0 }, mouth: null, yaw };
  const svg = K.renderToStaticMarkup(
    h("svg", {}, h(K.HairBehind, { p, hair: spec.hair, yaw, hairLag: 0 }), h(K.Head, { p, c: spec.palette, head: spec.head, hair: spec.hair, accessories: [], state, hairLag: 0 })),
  );
  const W = Math.ceil(p.headRx * 3.4);
  return rasterize(shapesOf(svg), -Math.floor(W / 2), -Math.ceil(p.headRy * 2.6), W, Math.ceil(p.headRy * 3.2));
};

/**
 * Skin where the hair should be. Above the ears: the outline of the head is hair (3 px in from the
 * silhouette), except the forehead/temple on the side the face turns to, below the hairline; on the
 * side away from the face (the back of the head in 3/4) a band that widens with the turn is hair too;
 * the crown (top 15% of the skull) has no skin anywhere. The forehead strip / parting is intended.
 */
const baldSpots = (img, spec, yaw) => {
  const p = spec.proportions;
  const c = spec.palette;
  const ry = p.headRy;
  const cy = -ry * 0.9;
  const skin = new Set([c.skin, c.skinShade].map((s) => s.toLowerCase()));
  const isSkin = (x, y) => skin.has(img.at(x, y));
  const out = [];
  const face = Math.sign(yaw);
  const ear = cy - 14;
  const hairline = cy - ry * 0.45;
  const crown = cy - ry * 0.85;
  const band = Math.round(p.headRx * 0.22 * Math.min(1, Math.abs(yaw)));
  for (let y = img.y0; y < ear; y++) {
    let x0 = null;
    let x1 = null;
    for (let x = img.x0; x < img.x0 + img.w; x++)
      if (img.at(x, y)) {
        x0 ??= x;
        x1 = x;
      }
    if (x0 === null) continue;
    for (const [s, xe] of [
      [-1, x0 + 3],
      [1, x1 - 3],
    ]) {
      const facing = Math.abs(yaw) < 0.15 || s === face;
      if (facing && y > hairline) continue;
      const n = facing ? 0 : band;
      for (let k = 0; k <= n; k++) if (isSkin(xe - s * k, y)) {
        out.push(`${s < 0 ? "left" : "right"} side (${xe - s * k}, ${y})`);
        break;
      }
    }
    if (y < crown) for (let x = x0; x <= x1; x++) if (isSkin(x, y)) {
      out.push(`crown (${x}, ${y})`);
      break;
    }
  }
  for (let x = img.x0; x < img.x0 + img.w; x++) {
    let y0 = null;
    for (let y = img.y0; y < img.y0 + img.h; y++) if (img.at(x, y)) {
      y0 = y;
      break;
    }
    if (y0 !== null && y0 < hairline && isSkin(x, y0 + 3)) out.push(`top (${x}, ${y0 + 3})`);
  }
  return out;
};

for (const [rig, P] of Object.entries(RIGS))
  test(`${rig}: no bald spots in any turn, for every hair kind and head shape`, () => {
    const bad = [];
    for (const shape of ["round", "oval", "soft"])
      for (const kind of KINDS)
        for (const yaw of YAWS) {
          const spec = specOf(kind, P, shape);
          const spots = baldSpots(headImage(spec, yaw), spec, yaw);
          if (spots.length) bad.push(`${shape}/${kind} yaw ${yaw}: ${spots.length} px, e.g. ${spots.slice(0, 2).join(", ")}`);
        }
    assert.deepEqual(bad, []);
  });

test("the check sees a bald head (sanity): the back-of-head hair removed at 3/4 is caught", () => {
  const spec = specOf("ponytail", K.ADULT);
  const img = headImage(spec, 1);
  // Paint the back half of the skull skin: must be reported.
  const fake = { ...img, at: (x, y) => (x < -20 && y < -spec.proportions.headRy && img.at(x, y) ? spec.palette.skin.toLowerCase() : img.at(x, y)) };
  assert.ok(baldSpots(fake, spec, 1).length > 10);
});

test("intended skin stays: the face, the forehead strip of pulled-back hair, the facing temple in 3/4", () => {
  for (const kind of KINDS)
    for (const yaw of [-1, 0, 1]) {
      const spec = specOf(kind, K.ADULT);
      const img = headImage(spec, yaw);
      const ry = spec.proportions.headRy;
      const cy = -ry * 0.9;
      const skin = spec.palette.skin.toLowerCase();
      assert.equal(img.at(Math.round(yaw * 20), Math.round(cy)), skin, `${kind} ${yaw}: face`);
      if (["bun", "ponytail", "lowBun"].includes(kind)) assert.equal(img.at(Math.round(yaw * 14), Math.round(cy - ry * 0.45)), skin, `${kind} ${yaw}: forehead strip`);
    }
});

test("back-compat: no back-of-head layer facing front (yaw 0 draws as before)", () => {
  for (const shape of ["round", "oval", "soft"]) assert.equal(K.hairCapPath(shape, { rx: 78, ry: 90, cy: -81 }, 0), null);
});
