#!/usr/bin/env node
// Render a template to MP4 with audio.
//   npm run render -- <CompositionId> [--out=out/name.mp4] [--frames=0-89] [--still=120] [--scale=0.5]
// Ids: PromoVertical, ReelProblemSolution, ReelProblemSolutionNoMusic, SketchCharacters, EndCardDemo.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith("--"));
const opt = (n) => args.find((a) => a.startsWith(`--${n}=`))?.split("=").slice(1).join("=");
if (!id) {
  console.error("usage: npm run render -- <CompositionId> [--out=…] [--frames=a-b] [--still=N] [--scale=x]");
  process.exit(1);
}
const audioDir = join(root, "public/audio");
if (!existsSync(audioDir) || readdirSync(audioDir).length === 0) {
  console.error("No audio yet. Run `npm run audio -- all` first (it works offline; see docs/AUDIO.md).");
  process.exit(1);
}
mkdirSync(join(root, "out"), { recursive: true });
const still = opt("still");
const out = opt("out") ?? `out/${id}${still ? `-${still}.png` : ".mp4"}`;
const extra = [];
if (still) extra.push("--frame=" + still);
else extra.push("--codec=h264", "--audio-codec=aac");
if (opt("frames")) extra.push(`--frames=${opt("frames")}`);
if (opt("scale")) extra.push(`--scale=${opt("scale")}`);
const cmd = still ? "still" : "render";
const r = spawnSync("npx", ["remotion", cmd, "src/index.ts", id, out, ...extra], { cwd: root, stdio: "inherit" });
process.exit(r.status ?? 1);
