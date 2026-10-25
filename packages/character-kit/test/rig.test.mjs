// Frame-by-frame rig test: npm test   (bundles the TS sources with esbuild first)
import { build } from "esbuild";
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outfile = join(mkdtempSync(join(tmpdir(), "ck-rig-")), "rigCheck.mjs");
await build({ entryPoints: [join(here, "rigCheck.ts")], bundle: true, platform: "node", format: "esm", outfile, logLevel: "error", jsx: "automatic" });
const { runAll } = await import(pathToFileURL(outfile).href);

test("every clip transition stays inside the rig's rules", () => {
  const { tracks, violations } = runAll();
  const byRule = {};
  for (const v of violations) byRule[v.rule] = (byRule[v.rule] ?? 0) + 1;
  const sample = violations.slice(0, 25).map((v) => `${v.track} f${v.frame} ${v.side} ${v.rule} ${v.detail}`).join("\n");
  assert.ok(tracks > 100, "sampled tracks");
  assert.equal(violations.length, 0, `${violations.length} violations ${JSON.stringify(byRule)}\n${sample}`);
});
