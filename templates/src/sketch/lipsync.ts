import { cuesFromAlignment, type Alignment, type MouthCue } from "@eliseo-arevalo/character-kit";
import data from "./lipsync.json";

type Entry = { kind: "alignment"; data: Alignment } | { kind: "cues"; data: MouthCue[] };
const lines = data as unknown as Record<"anoto" | "remate" | "listo", Entry>;
const cues = (e: Entry): MouthCue[] => (e.kind === "alignment" ? cuesFromAlignment(e.data) : e.data);

/** Mouth cues for each spoken line of the sketch. `lipsync.json` is written by `npm run audio -- sketch`
 *  (Rhubarb from the voice file, or the TTS provider's character timestamps). */
export const anotoEs = cues(lines.anoto);
export const remateEs = cues(lines.remate);
export const listoEs = cues(lines.listo);
