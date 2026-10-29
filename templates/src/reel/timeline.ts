// Reel timeline (30 fps, 958 frames ≈ 31.9 s). Global frames; scenes get local offsets.
// Keep PROBLEM (6.0 s), WORRY (10.1 s) and SWITCH (12.4 s) in sync with `npm run audio -- reel` (audio/reel.json).
import { voManifest } from "./voManifest";

export const FPS = 30;
export const WIPE = 16;

export const scenes = {
  hook: { from: 0, duration: 180 },
  problem: { from: 180, duration: 192 },
  solution: { from: 372, duration: 296 },
  relief: { from: 668, duration: 150 },
  end: { from: 818, duration: 140 },
} as const;
export type SceneId = keyof typeof scenes;
export const DURATION = scenes.end.from + scenes.end.duration; // 958 ≈ 31.9 s

// Hook: narration "Vendés todo el día: cobrás, das vuelto, fiás..." over a busy run of sales.
// Word starts on the reference voice (s); re-measure if you change voice or text: cobrás 1.41, das vuelto 2.06, fiás 2.83, end 3.27.
export const narr = { at: 6, frames: voManifest.vendes.frames };
const w = (sec: number) => narr.at + Math.round(sec * FPS);
export const hook = {
  // bag → cash ("cobrás") → change ("das vuelto") → fiado ("fiás") → rush of sales → papelitos
  shots: [0, w(1.41) - 4, w(2.83) - 4, 120, 150],
  scanAt: 8,
  billAt: w(1.41) + 4,
  coinsAt: w(2.06),
  fiadoAt: w(2.83),
  rush: [122, 128, 134, 140],
  papersAt: 154,
};

// Problem: the owner's line, split in two with a breath between the questions:
// "¿Cuánto vendí hoy?" … "¿Y quién me debe?", then a worried beat (no voice) before the app.
const q1 = 26;
const q2 = q1 + voManifest.cuantoA.frames + 18;
export const vo = { q1, q2 };
export const problem = {
  closeUpAt: q2 - 4, // cut to the notebook as Q2 starts
  worryAt: q2 + voManifest.cuantoB.frames + 4, // back on her: worried, scratches her head, sighs
};

// Solution (local frames; each beat's vo/switchAt/… are relative to its own from): splash → sale → fiado → day total, each under its narration line.
// Word starts on the reference voice: sale "anotás" 0.80 / "segundos" 1.93; fiado "fiás" 0.27 / "quién" 1.64;
// total "sabés" 0.92 / "cuánto vendiste" 1.30.
export const solution = {
  splashDone: 24,
  sale: { from: 0, vo: 24, addAt: [46, 56, 66], chargeAt: 84 },
  fiado: { from: 118, vo: 2, switchAt: 4, amountAt: 10, pickAt: 50, confirmAt: 68 },
  total: { from: 208, vo: 4, at: 6 },
  debtCopyAt: 118,
  totalCopyAt: 208,
};

// Relief (local): notebook closes, then the shutter comes down.
export const relief = { vo: 22, closeAt: 22, outsideAt: 62, shutterAt: 6, letGo: 34, landAt: 62 };

export const end = { at: 4, vo: 16 };
