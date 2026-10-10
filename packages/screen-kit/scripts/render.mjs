#!/usr/bin/env node
// Usage: screen-kit-render <sceneId> [--still=<frame>] [--out=path] [--concurrency=N] [--strict]
//          [--scenes=scenes] [--captures=public] [--entry=src/index.ts] [--composition=UsabilityScene]
// Copies <scenes>/<id>.json to <captures>/<id>/scene.json (timeline edits don't need a recapture),
// lints it, then renders with the project's Remotion CLI. Run from the project folder.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { lint } from './lint.mjs';
const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d;
const id = process.argv.slice(2).find((a) => !a.startsWith('--'));
if (!id) { console.error('usage: screen-kit-render <sceneId> [--still=N] [--out=path] [--scenes=scenes] [--captures=public] [--entry=src/index.ts]'); process.exit(1); }
const scenes = arg('scenes', 'scenes'), captures = arg('captures', 'public');
const entry = arg('entry', 'src/index.ts'), comp = arg('composition', 'UsabilityScene');
fs.copyFileSync(`${scenes}/${id}.json`, `${captures}/${id}/scene.json`);
const scene = JSON.parse(fs.readFileSync(`${scenes}/${id}.json`, 'utf8'));
const { width = 1920, height = 1080 } = scene.composition;
const warnings = lint(scene, JSON.parse(fs.readFileSync(`${captures}/${id}/manifest.json`, 'utf8')));
for (const w of warnings) console.log(`⚠ lint: ${w}`);
if (warnings.length && process.argv.includes('--strict')) process.exit(1);
const props = JSON.stringify({ sceneId: id });
const still = arg('still');
const out = arg('out') ?? (still ? `out/${id}-f${still}.png` : `out/${id}-${width}x${height}.mp4`);
// resolve the Remotion CLI the project installed (keeps one remotion/react copy)
const req = createRequire(path.join(process.cwd(), 'package.json'));
const cliPkg = req.resolve('@remotion/cli/package.json');
const binRel = JSON.parse(fs.readFileSync(cliPkg, 'utf8')).bin.remotion;
const bin = path.join(path.dirname(cliPkg), binRel);
const common = [`--props=${props}`, `--public-dir=${captures}`];
const args = still
  ? ['still', entry, comp, out, `--frame=${still}`, ...common]
  : ['render', entry, comp, out, ...common, '--codec=h264', '--crf=14', '--x264-preset=slow', '--image-format=png', ...(arg('concurrency') ? [`--concurrency=${arg('concurrency')}`] : [])];
execFileSync(process.execPath, [bin, ...args], { stdio: 'inherit' });
console.log(`→ ${out}`);
