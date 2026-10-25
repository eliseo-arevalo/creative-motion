import type { MouthCue, Viseme } from "./types";

/**
 * Lip-sync from TTS character timestamps (ElevenLabs `with-timestamps` alignment), tuned for
 * Spanish. Spanish spelling is close to phonetic, so letters map to mouth shapes directly:
 *
 *   vowels   a → D (wide open) · e → C · i/y → B · o → E (round) · u → F (pucker)
 *   lips     m b p v → A (closed)  ·  f → G (teeth on lip)
 *   tongue   l n ñ d t → H
 *   others   → B, but they take the rounding of a following o / u (anticipation: "so", "cu")
 *   silent   h, the u in que/qui/gue/gui
 *
 * Spaces / punctuation become a rest (X) only when the pause is long enough; short gaps are bridged.
 * Rhubarb (scripts/lipsync.sh) stays the fallback for audio without an alignment.
 */
export type Alignment = {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
};

export type AlignmentOptions = {
  /** Seconds added to every cue (e.g. leading silence added to the audio). */
  offset?: number;
  /** Pauses shorter than this are bridged instead of closing the mouth (s). */
  minRest?: number;
  /** Shortest cue kept (s); shorter ones merge into a neighbour. */
  minCue?: number;
};

const strip = (c: string) =>
  c
    .toLowerCase()
    .replace(/ñ/g, "\u0000")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0000/g, "ñ");

const VOWEL: Record<string, Viseme> = { a: "D", e: "C", i: "B", o: "E", u: "F" };
const isLetter = (c: string) => /[a-zñ]/.test(c);

const letterViseme = (c: string, next: string | undefined): Viseme | null => {
  if (VOWEL[c]) return VOWEL[c];
  if (c === "y") return next && VOWEL[next] ? "B" : "B";
  if (c === "h") return null;
  if ("mbpv".includes(c)) return "A";
  if (c === "f") return "G";
  if ("lnñdt".includes(c)) return "H";
  // Lip rounding starts during the consonant before a rounded vowel ("so", "cu").
  return next === "o" ? "E" : next === "u" ? "F" : "B";
};

export const cuesFromAlignment = (a: Alignment, opts: AlignmentOptions = {}): MouthCue[] => {
  const { offset = 0, minRest = 0.12, minCue = 0.045 } = opts;
  const ch = a.characters.map(strip);
  const st = a.character_start_times_seconds;
  const en = a.character_end_times_seconds;
  type Raw = MouthCue & { keep: boolean };
  const raw: Raw[] = [];
  let gapStart: number | null = null;
  let punct = false;

  const push = (start: number, end: number, value: Viseme, keep: boolean) => {
    const last = raw[raw.length - 1];
    if (last && last.value === value && start - last.end < 0.02) {
      last.end = end;
      last.keep = last.keep || keep;
    } else raw.push({ start, end, value, keep });
  };

  for (let i = 0; i < ch.length; i++) {
    const c = ch[i];
    if (!isLetter(c)) {
      if (gapStart === null) gapStart = st[i];
      if (c.trim()) punct = true;
      continue;
    }
    if (gapStart !== null) {
      // A real pause (or punctuation) closes the mouth; a short gap between words is bridged.
      if (raw.length && (st[i] - gapStart >= minRest || (punct && st[i] - gapStart >= 0.03))) push(gapStart, st[i], "X", true);
      else if (raw.length) raw[raw.length - 1].end = st[i];
      gapStart = null;
      punct = false;
    }
    // Next sounded letter (skip silent h / u in que-gue).
    let j = i + 1;
    while (j < ch.length && ch[j] === "h") j++;
    const next = ch[j];
    const prev = ch[i - 1];
    const silentU = c === "u" && (prev === "q" || prev === "g") && (next === "e" || next === "i");
    const v = silentU ? null : letterViseme(c, next);
    if (v === null) {
      if (raw.length) raw[raw.length - 1].end = en[i];
      continue;
    }
    // Close any tiny hole left by the previous letter.
    if (raw.length && st[i] > raw[raw.length - 1].end && st[i] - raw[raw.length - 1].end < 0.04) raw[raw.length - 1].end = st[i];
    // Vowels and lip closures must always be seen; other consonants may merge away.
    push(st[i], Math.max(en[i], st[i] + 0.01), v, !!VOWEL[c] || v === "A");
  }

  // Too-short cues: vowels and lip closures are kept and lengthened (pushing the next cue later);
  // short consonants merge into the previous cue.
  const out: MouthCue[] = [];
  for (const r of raw) {
    const c: MouthCue = { start: r.start, end: r.end, value: r.value };
    const last = out[out.length - 1];
    if (last && last.end > c.start) c.start = last.end;
    const d = c.end - c.start;
    if (d < minCue && !r.keep && last) {
      last.end = Math.max(last.end, c.end);
      continue;
    }
    if (d < minCue) c.end = c.start + minCue;
    if (last && last.value === c.value) {
      last.end = c.end;
      continue;
    }
    out.push(c);
  }
  const end = out.length ? out[out.length - 1].end : 0;
  out.push({ start: end, end: end + 0.3, value: "X" });
  return out.filter((c) => c.end > c.start).map((c) => ({ start: +(c.start + offset).toFixed(3), end: +(c.end + offset).toFixed(3), value: c.value }));
};
