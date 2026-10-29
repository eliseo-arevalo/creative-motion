// promo timeline: derived from the measured voice-line lengths (voManifest.ts).
// Change a phrase → re-run `npm run audio -- promo` → every scene re-times itself.
import { buildTimeline, type PlacedScene, type SceneSpec } from "../kit/timeline";
import { voManifest, type VoKey } from "./voManifest";

export const WIPE = 20;

export type SceneId = "hook" | "problem" | "sale" | "fiado" | "abono" | "gasto" | "proveedores" | "resumen" | "end";

const phrase = (key: VoKey, gapBefore = 0) => ({ key, frames: voManifest[key].frames, gapBefore });

const specs: SceneSpec<SceneId>[] = [
  { id: "hook", lead: 16, phrases: [phrase("hook")], tail: 34 },
  { id: "problem", lead: 14, phrases: [phrase("problem")], tail: 40 },
  { id: "sale", lead: 12, phrases: [phrase("sale")], tail: 40 },
  { id: "fiado", lead: 12, phrases: [phrase("fiado")], tail: 36 },
  { id: "abono", lead: 12, phrases: [phrase("abono")], tail: 36 },
  { id: "gasto", lead: 12, phrases: [phrase("gasto")], tail: 30 },
  { id: "proveedores", lead: 12, phrases: [phrase("proveedores")], tail: 32 },
  { id: "resumen", lead: 12, phrases: [phrase("resumen"), phrase("parado", 8)], tail: 30 },
  { id: "end", lead: 14, phrases: [phrase("end")], tail: 66 },
];

export const promo = buildTimeline(specs, WIPE);
export type PromoScene = PlacedScene<SceneId>;

/** Local frame helpers for a placed scene. */
export const vo = (scene: PromoScene, i = 0) => scene.phrases[i];

// Beats shared by visuals and audio (local frames). Each is expressed relative to
// the phrase it illustrates, so timing follows the voice automatically.
export const beats = {
  sale: (s: PromoScene) => {
    const p = vo(s);
    const step = Math.round((p.frames * 0.55) / 4);
    return { addAt: [0, 1, 2, 3].map((i) => p.at + 6 + i * step), chargeAt: p.at + Math.round(p.frames * 0.72) };
  },
  fiado: (s: PromoScene) => {
    const p = vo(s);
    return { switchAt: 4, amountAt: p.at + 6, pickAt: p.at + Math.round(p.frames * 0.5), confirmAt: p.at + Math.round(p.frames * 0.8) };
  },
  abono: (s: PromoScene) => {
    const p = vo(s);
    return { pressAt: p.at + Math.round(p.frames * 0.52) };
  },
  gasto: (s: PromoScene) => {
    const p = vo(s);
    return {
      switchAt: 2,
      amountAt: p.at + 4,
      conceptAt: p.at + Math.round(p.frames * 0.12),
      dateAt: p.at + Math.round(p.frames * 0.58),
      providerAt: p.at + Math.round(p.frames * 0.8),
      saveAt: p.end + 6,
    };
  },
  proveedores: (s: PromoScene) => {
    const p = vo(s);
    return { barsAt: p.at + 10, highlightAt: p.at + Math.round(p.frames * 0.75) };
  },
  resumen: (s: PromoScene) => {
    const p = vo(s);
    return { chipsAt: p.at, sheetAt: p.at + Math.round(p.frames * 0.62), paradoAt: vo(s, 1).at };
  },
};
