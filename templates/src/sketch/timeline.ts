// Reel timeline (30 fps, 600 frames = 20.0 s). Global frames; scenes get local offsets.
// Keep CHAOS (3.4 s), NIGHT (8.0 s), REWIND (12.4 s) and REDO (13.07 s) in sync with audio/sketch.json (`npm run audio -- sketch`).
import { voManifest } from "./voManifest";

export const FPS = 30;
export const WIPE = 16;

export const scenes = {
  hook: { from: 0, duration: 102 },
  chaos: { from: 102, duration: 138 },
  night: { from: 240, duration: 132 },
  rewind: { from: 372, duration: 20 },
  redo: { from: 392, duration: 132 },
  end: { from: 524, duration: 76 },
} as const;
export type SceneId = keyof typeof scenes;
export const DURATION = scenes.end.from + scenes.end.duration; // 600 = 20.0 s

// Word starts on the reference voice (s); re-measure if you change voice or text. anoto: "Sí, sí… ahorita lo anoto, va." — ahorita 0.86, anoto 1.36, va 1.78.
// remate: "¿Y esos tres dólares… de quién eran?" — tres 0.51, de 1.47, eran 1.88. listo: anotado 0.57.
const sec = (s: number) => Math.round(s * FPS);

// The sale (shared by the hook and the redo, same framing): customer's hand in with the $3 bill,
// she takes it, the hand leaves.
export const sale = { handIn: 2, takeAt: 14, grabAt: 22, handOut: 40 };

// Hook (local): she pockets the bill, waves it off: "Sí, sí… ahorita lo anoto, va."
export const hook = {
  vo: 30,
  bubbleAt: 30 + sec(0.86) - 2,
  pocketAt: 30 + sec(0.86) - 6,
  bellAt: sale.handOut + 6,
  headAt: 2,
  end: voManifest.anoto.frames + 30,
};

// Chaos (local): four shots, faster and faster. `tally` = frames where the unnoted count goes up.
export const chaos = {
  shots: [0, 38, 72, 104, 116, 128],
  tally: [0, 16, 30, 54, 82, 106, 124],
  ringAt: 40,
  answerAt: 56,
  kidAt: 74,
};

// Night (local): notebook + scratch, the line, then the deadpan look to camera (comic beat).
export const night = {
  head: 4,
  vo: 12,
  deadpanAt: 12 + voManifest.remate.frames + 6, // 91
  zoomFrames: 6,
  cricketAt: [108, 122],
};

// Rewind (global source frames played backwards).
export const rewind = { from: scenes.night.from - 1, to: 6 };

// Redo (local): same sale; this time she grabs the phone and notes it in two taps before the customer goes.
export const redo = {
  phoneAt: 26, // pose "phone"
  closeUp: 32, // cut to the app
  pickAt: 44, // tap 1: Queso $3.00
  chargeAt: 62, // tap 2: Cobrar → Venta registrada ✓
  wideAt: 88, // back on her, the customer leaves
  vo: 90,
  handOut: 96,
};

export const end = { at: 2 };
