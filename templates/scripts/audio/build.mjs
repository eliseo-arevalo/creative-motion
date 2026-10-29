#!/usr/bin/env node
// Builds the audio of one template: voice-over, SFX, music bed, the TS manifest with measured frame counts, lip-sync data.
//
//   node scripts/audio/build.mjs <promo|reel|sketch|endcard|all> [options]
//     --voice=elevenlabs|gemini|placeholder   TTS provider (default: elevenlabs if the key is set, else gemini, else placeholder)
//     --lipsync=rhubarb|alignment|uniform     mouth data for the sketch (default: rhubarb if installed, else the provider's alignment, else uniform)
//     --sfx-dir=<dir>                         use <dir>/<sfx-name>.(wav|mp3|ogg) when present instead of the synthetic one
//     --music=<file>                          use this file as the music bed instead of the synthetic one (trimmed/looped to length)
//     (audio/<template>.json "fit": frames a line should not exceed; longer lines are sped up to fit, max 1.45x)
//     --force                                 re-synthesise voice lines that already exist in .cache (costs credits)
//     --dry                                   print what would run, call nothing
//
// Output (all git-ignored): public/audio/<dir>/*.wav, .cache/vo/<dir>/*; committed-but-generated: src/<dir>/voManifest.ts, src/sketch/lipsync.json.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, copyFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PROVIDERS, uniformAlignment } from "./voice.mjs";
import { synthMusic, synthSfx } from "./synth.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const FPS = 30;

// Optional .env at the repo root or in templates/ (never committed).
for (const f of [join(ROOT, "../.env"), join(ROOT, ".env")]) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, "utf8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !line.trim().startsWith("#") && m[2] && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const args = process.argv.slice(2);
const target = args.find((a) => !a.startsWith("--")) ?? "all";
const opt = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
const flag = (name) => args.includes(`--${name}`);
// The active brand is whatever src/tokens.ts bridges to (change it with `npm run brand -- <id>`).
const brandId = /brands\/([^/]+)\/tokens/.exec(readFileSync(join(ROOT, "src/tokens.ts"), "utf8"))?.[1] ?? "demo";
const activeBrand = JSON.parse(readFileSync(join(ROOT, `../brands/${brandId}/brand.json`), "utf8"));

const run = (cmd, a, o = {}) => {
  const r = spawnSync(cmd, a, { encoding: "utf8", ...o });
  if (r.status !== 0) throw new Error(`${cmd} ${a.slice(0, 4).join(" ")} failed: ${r.stderr}`);
  return r.stdout;
};
const duration = (file) => Number(run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).trim());
const has = (cmd) => spawnSync("sh", ["-c", `command -v ${cmd}`]).status === 0;

const voice =
  opt("voice") ?? (process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_VOICE_ID ? "elevenlabs" : process.env.GEMINI_API_KEY ? "gemini" : "placeholder");
if (!PROVIDERS[voice]) throw new Error(`unknown voice provider: ${voice}`);
const rhubarb = process.env.RHUBARB || (has("rhubarb") ? "rhubarb" : null);
const lipMode = opt("lipsync") ?? (rhubarb ? "rhubarb" : voice === "elevenlabs" ? "alignment" : "uniform");
const sfxDir = opt("sfx-dir");
const musicFile = opt("music");
const names = target === "all" ? ["promo", "reel", "sketch", "endcard"] : [target];

const normalizeVo = (input, out, fitFrames) => {
  // highpass, peak −2 dBFS, limiter, edge fades — the same chain for every line.
  const vd = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", input, "-af", "volumedetect", "-f", "null", "-"], { encoding: "utf8" });
  const max = Number(/max_volume: (-?[\d.]+) dB/.exec(vd.stderr)?.[1] ?? 0);
  // Templates whose shots are timed to the voice (`fit` in audio/<template>.json) get a line speed-up, never more than 1.45x.
  const dur = duration(input);
  const tempo = fitFrames && dur * FPS > fitFrames ? Math.min(1.45, (dur * FPS) / fitFrames) : 1;
  const st = Math.max(0, dur / tempo - 0.05);
  run("ffmpeg", ["-v", "error", "-y", "-i", input, "-af", `${tempo > 1 ? `atempo=${tempo.toFixed(3)},` : ""}highpass=f=80,volume=${(-2 - max).toFixed(2)}dB,alimiter=limit=0.79:level=0:attack=5:release=50,afade=t=in:d=0.008,afade=t=out:st=${st}:d=0.05`, "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le", out]);
};

for (const name of names) {
  const cfg = JSON.parse(readFileSync(join(ROOT, `audio/${name}.json`), "utf8"));
  const out = join(ROOT, "public/audio", cfg.dir);
  const cache = join(ROOT, ".cache/vo", cfg.dir);
  mkdirSync(out, { recursive: true });
  mkdirSync(cache, { recursive: true });
  console.log(`\n== ${name}: voice=${voice} lipsync=${lipMode}${sfxDir ? ` sfx-dir=${sfxDir}` : " sfx=synthetic"}`);
  const manifest = {};
  const alignments = {};
  const log = [];

  for (const [key, raw] of Object.entries(cfg.vo)) {
    const text = raw.replaceAll("{name}", activeBrand.pronunciation ?? activeBrand.name);
    const base = join(cache, `${key}.${voice}`);
    const meta = `${base}.json`;
    let file = [".mp3", ".wav"].map((e) => base + e).find(existsSync);
    let alignment;
    if (file && existsSync(meta) && !flag("force") && JSON.parse(readFileSync(meta, "utf8")).text === text) {
      alignment = JSON.parse(readFileSync(meta, "utf8")).alignment;
      console.log(`  vo ${key}: cached`);
    } else {
      if (flag("dry")) { console.log(`  vo ${key}: would synthesise "${text}"`); continue; }
      const r = await PROVIDERS[voice](text, base);
      file = r.file;
      alignment = r.alignment;
      writeFileSync(meta, JSON.stringify({ text, provider: voice, sha256: createHash("sha256").update(readFileSync(file)).digest("hex"), cost: r.cost ?? null, alignment }, null, 1));
      console.log(`  vo ${key}: synthesised (${r.cost ?? 0} credits)`);
    }
    const wav = join(out, `vo-${key}.wav`);
    normalizeVo(file, wav, cfg.fit?.[key]);
    const secs = duration(wav);
    manifest[key] = { src: `audio/${cfg.dir}/vo-${key}.wav`, frames: Math.ceil(secs * FPS), text: raw };
    alignments[key] = alignment ?? uniformAlignment(text, secs);
    log.push({ key, wav, secs });
  }
  if (flag("dry")) continue;

  // SFX: user-supplied file wins over the synthetic recipe.
  for (const sfx of cfg.sfx) {
    const dest = join(out, `${sfx}.wav`);
    const own = sfxDir && ["wav", "mp3", "ogg"].map((e) => join(sfxDir, `${sfx}.${e}`)).find(existsSync);
    if (own) run("ffmpeg", ["-v", "error", "-y", "-i", own, "-af", "afade=t=in:d=0.004", "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", dest]);
    else synthSfx(sfx, dest);
  }
  console.log(`  sfx: ${cfg.sfx.length} files`);

  // Music bed.
  const seconds = cfg.music.seconds;
  const bed = join(out, "music-bed.wav");
  if (musicFile) run("ffmpeg", ["-v", "error", "-y", "-stream_loop", "-1", "-i", musicFile, "-t", String(seconds), "-af", `loudnorm=I=-22:TP=-3:LRA=7,afade=t=in:d=1.5,afade=t=out:st=${seconds - 2.5}:d=2.5`, "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", bed]);
  else synthMusic(seconds, bed);
  console.log(`  music: ${seconds}s bed`);

  // TS manifest with measured frames (templates without voice lines have no manifest).
  if (cfg.manifest) {
  const body = Object.entries(manifest).map(([k, v]) => `  ${k}: { src: ${JSON.stringify(v.src)}, frames: ${v.frames}, text: ${JSON.stringify(v.text)} },`).join("\n");
  writeFileSync(join(ROOT, cfg.manifest), `// GENERATED by scripts/audio/build.mjs — do not edit by hand. frames = ceil(seconds × ${FPS}) of each voice line.\nexport const voManifest = {\n${body}\n} as const;\n\nexport type VoKey = keyof typeof voManifest;\n`);
  }

  // Lip-sync data for templates with talking characters.
  if (cfg.lipsync) {
    const lip = {};
    for (const { key, wav } of log) {
      if (lipMode === "rhubarb") {
        if (!rhubarb) throw new Error("--lipsync=rhubarb needs Rhubarb (see docs/RHUBARB.md)");
        const tmp = join(cache, `${key}.rhubarb.json`);
        run(rhubarb, ["-q", "-r", "phonetic", "-f", "json", "--extendedShapes", "GHX", "-o", tmp, wav]);
        lip[key] = { kind: "cues", data: JSON.parse(readFileSync(tmp, "utf8")).mouthCues };
      } else lip[key] = { kind: "alignment", data: alignments[key] };
    }
    writeFileSync(join(ROOT, cfg.lipsync), JSON.stringify(lip) + "\n");
    console.log(`  lipsync: ${lipMode}`);
  }
  if (cfg.manifest) console.log(`  manifest: ${cfg.manifest}`);
}
