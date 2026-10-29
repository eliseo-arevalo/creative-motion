// Synthetic SFX and music beds made with ffmpeg only (no third-party audio, so they are ours and redistributable).
// They are placeholders with a clear job: make every template render with sound on a clean machine.
// For nicer sound pass --sfx-dir=<folder with sfx-<name>.wav|mp3> to build.mjs (see docs/AUDIO.md).
import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";

const P = "2*PI";
/** A decaying sine partial: starts at `t0`, frequency `f`, decay `k` (1/s), gain `g`. */
const ping = (t0, f, k, g = 0.35) => `${g}*gt(t,${t0})*exp(-${k}*(t-${t0}))*sin(${P}*${f}*t)`;
const sum = (...e) => e.join("+");

/** name → [duration s, ffmpeg source (lavfi), optional audio filter]. */
export const RECIPES = {
  "sfx-coins": [0.9, `aevalsrc='${sum(ping(0, 4200, 26), ping(0.07, 5300, 26), ping(0.15, 3600, 24), ping(0.24, 5900, 28), ping(0.34, 4700, 30))}':s=48000`],
  "sfx-door-bell": [1.4, `aevalsrc='${sum(ping(0, 1318, 3.2, 0.3), ping(0, 2637, 5, 0.1), ping(0.28, 1760, 3, 0.3), ping(0.28, 3520, 5, 0.08))}':s=48000`],
  "sfx-papers": [1.4, "anoisesrc=d=1.4:c=white:r=48000", "highpass=f=1600,lowpass=f=9000,volume='0.7*abs(sin(t*37))*abs(sin(t*11.3))*exp(-1.6*t)':eval=frame"],
  "sfx-crumple": [1.1, "anoisesrc=d=1.1:c=pink:r=48000", "highpass=f=500,lowpass=f=5000,volume='0.9*abs(sin(t*53))*abs(sin(t*17))*exp(-2*t)':eval=frame"],
  "sfx-scribble": [0.9, "anoisesrc=d=0.9:c=white:r=48000", "bandpass=f=3200:w=1800,volume='0.5*abs(sin(t*28))*min(1,t*12)*min(1,(0.9-t)*12)':eval=frame"],
  "sfx-scanner": [0.3, `aevalsrc='0.3*lt(t,0.14)*sin(${P}*2400*t)':s=48000`],
  "sfx-pop": [0.2, `aevalsrc='0.5*exp(-38*t)*sin(${P}*(420+900*t)*t)':s=48000`],
  "sfx-positive": [1.2, `aevalsrc='${sum(ping(0, 880, 5, 0.3), ping(0.12, 1109, 5, 0.3), ping(0.24, 1319, 4, 0.3), ping(0.24, 2637, 7, 0.08))}':s=48000`],
  "sfx-ding": [1.4, `aevalsrc='${sum(ping(0, 1568, 3, 0.35), ping(0, 3136, 4.5, 0.12), ping(0, 4704, 6, 0.05))}':s=48000`],
  "sfx-balance": [1.2, `aevalsrc='${sum(ping(0, 784, 4, 0.3), ping(0.14, 988, 4, 0.3), ping(0.14, 1976, 6, 0.08))}':s=48000`],
  "sfx-whoosh": [0.6, "anoisesrc=d=0.6:c=pink:r=48000", "highpass=f=300,lowpass=f=4200,volume='0.8*sin(PI*t/0.6)^2':eval=frame"],
  "sfx-wipe": [0.8, "anoisesrc=d=0.8:c=pink:r=48000", "highpass=f=400,lowpass=f=5200,volume='0.7*sin(PI*t/0.8)^2':eval=frame"],
  "sfx-page": [0.5, "anoisesrc=d=0.5:c=white:r=48000", "highpass=f=2200,lowpass=f=9000,volume='0.6*exp(-9*t)*min(1,t*80)':eval=frame"],
  "sfx-notebook": [0.7, "anoisesrc=d=0.7:c=white:r=48000", "highpass=f=1800,lowpass=f=8000,volume='0.55*(exp(-10*t)+0.6*exp(-12*abs(t-0.22)))*min(1,t*80)':eval=frame"],
  "sfx-shutter": [1.6, "anoisesrc=d=1.6:c=brown:r=48000", "lowpass=f=1100,volume='1.4*(0.6+0.4*abs(sin(t*21)))*min(1,t*8)*min(1,(1.6-t)*6)':eval=frame"],
  "sfx-slide-stop": [0.6, `aevalsrc='${sum(`0.7*exp(-16*t)*sin(${P}*85*t)`, `0.25*exp(-90*t)*sin(${P}*1900*t)`)}':s=48000`],
  "sfx-ticks": [6, `aevalsrc='0.45*exp(-160*mod(t,0.25))*sin(${P}*1800*t)':s=48000`],
  "sfx-scratch": [0.5, `aevalsrc='0.45*exp(-7*t)*sin(${P}*(900+3200*t)*t)':s=48000`, "highpass=f=400"],
  "sfx-ringtone": [3.2, `aevalsrc='0.22*lt(mod(t,1.4),0.45)*(sin(${P}*440*t)+sin(${P}*480*t))':s=48000`],
  "sfx-giggle": [0.9, `aevalsrc='0.3*lt(mod(t,0.2),0.11)*sin(${P}*(720+160*sin(35*t))*t)*exp(-1.4*t)':s=48000`],
  "sfx-cricket": [0.8, `aevalsrc='0.25*lt(mod(t,0.11),0.045)*sin(${P}*4500*t)*sin(PI*min(1,t/0.8))':s=48000`],
  "sfx-rewind": [1.6, `aevalsrc='0.22*sin(${P}*(500+2400*mod(t,0.16)/0.16)*t)*min(1,t*10)*min(1,(1.6-t)*8)':s=48000`],
  "sfx-soft-click": [0.12, `aevalsrc='0.55*exp(-90*t)*sin(${P}*1250*t)':s=48000`],
};

const ff = (args) => {
  const r = spawnSync("ffmpeg", ["-v", "error", "-y", ...args], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`);
};

/** Peak level in dBFS of an audio file (ffmpeg volumedetect). */
export function peakDb(file) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", "volumedetect", "-f", "null", "-"], { encoding: "utf8" });
  const m = /max_volume: (-?[\d.]+) dB/.exec(r.stderr);
  return m ? Number(m[1]) : 0;
}

export function synthSfx(name, out) {
  const r = RECIPES[name];
  if (!r) throw new Error(`no synthetic recipe for ${name}`);
  const [dur, src, filter] = r;
  const af = `${filter ? filter + "," : ""}afade=t=in:d=0.004,afade=t=out:st=${Math.max(0, dur - 0.03)}:d=0.03,alimiter=limit=0.85`;
  const tmp = `${out}.tmp.wav`;
  ff(["-f", "lavfi", "-i", src, "-t", String(dur), "-af", af, "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", tmp]);
  const max = peakDb(tmp);
  // Every SFX leaves here peaking at −6 dBFS; the compositions set the final level per cue.
  ff(["-i", tmp, "-af", `volume=${(-6 - max).toFixed(2)}dB`, "-c:a", "pcm_s16le", out]);
  rmSync(tmp);
}

/**
 * A soft, original music bed: a warm pad plus a slow plucked arpeggio in A minor (Am – F – C – G, 8 s per loop of four bars),
 * low-passed and normalised quiet so it stays under the voice. `seconds` is the length; it fades in/out.
 */
export function synthMusic(seconds, out) {
  const chords = [[220, 261.63, 329.63], [174.61, 220, 261.63], [130.81, 196, 261.63], [196, 246.94, 293.66]];
  const bar = 2; // seconds per chord
  const beat = 0.5; // arpeggio step
  const pad = (i) => {
    const sel = `eq(mod(floor(t/${bar}),4),${i})`;
    return chords[i].map((f) => `0.05*${sel}*sin(${P}*${f}*t)`).join("+");
  };
  const arp = (i) => {
    const sel = `eq(mod(floor(t/${bar}),4),${i})`;
    return chords[i].map((f, n) => `0.11*${sel}*eq(mod(floor(t/${beat}),3),${n})*exp(-5*mod(t,${beat}))*sin(${P}*${f * 2}*t)`).join("+");
  };
  const expr = [0, 1, 2, 3].map((i) => `${pad(i)}+${arp(i)}`).join("+");
  ff([
    "-f", "lavfi", "-i", `aevalsrc='${expr}':s=48000:d=${seconds}`,
    "-af", `lowpass=f=2600,aecho=0.7:0.5:380|620:0.28|0.2,loudnorm=I=-22:TP=-3:LRA=7,afade=t=in:d=1.5,afade=t=out:st=${Math.max(0, seconds - 2.5)}:d=2.5`,
    "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", out,
  ]);
}
