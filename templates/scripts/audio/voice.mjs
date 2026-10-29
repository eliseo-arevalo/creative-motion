// Text-to-speech providers. Each returns { file, alignment?, cost? } and writes a raw audio file at `base` + ext.
//   elevenlabs  ELEVENLABS_API_KEY + ELEVENLABS_VOICE_ID (required: pick a voice you may use commercially), optional ELEVENLABS_MODEL
//   gemini      GEMINI_API_KEY, optional GEMINI_TTS_MODEL / GEMINI_VOICE (default Kore)
//   placeholder no network: a mumble with the right length, only to test timing and the pipeline
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const need = (name) => {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set (see .env.example)`);
  return v;
};

const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`${cmd} failed: ${r.stderr}`);
};

async function elevenlabs(text, base) {
  const key = need("ELEVENLABS_API_KEY");
  const voice = need("ELEVENLABS_VOICE_ID");
  const model = process.env.ELEVENLABS_MODEL ?? "eleven_multilingual_v2";
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voice}/with-timestamps?output_format=mp3_44100_128`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "xi-api-key": key, "content-type": "application/json" },
    body: JSON.stringify({
      text,
      model_id: model,
      voice_settings: { stability: 0.45, similarity_boost: 0.75, style: 0.35, use_speaker_boost: true },
    }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const j = await res.json();
  const file = `${base}.mp3`;
  writeFileSync(file, Buffer.from(j.audio_base64, "base64"));
  return { file, alignment: j.alignment, cost: text.length };
}

async function gemini(text, base) {
  // The TTS model occasionally answers with text instead of audio: retry a few times before failing.
  let last;
  for (let i = 0; i < 4; i++) {
    try {
      return await geminiOnce(text, base);
    } catch (e) {
      last = e;
    }
  }
  throw last;
}

async function geminiOnce(text, base) {
  const key = need("GEMINI_API_KEY");
  const model = process.env.GEMINI_TTS_MODEL ?? "gemini-2.5-flash-preview-tts";
  const voiceName = process.env.GEMINI_VOICE ?? "Kore";
  const style = process.env.GEMINI_STYLE ?? "Say at a brisk, natural pace, warm and conversational: ";
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": key, "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: style + text }] }],
      generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } } },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const j = await res.json();
  const part = j.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  if (!part) throw new Error("Gemini returned no audio");
  const pcm = `${base}.pcm`;
  writeFileSync(pcm, Buffer.from(part.inlineData.data, "base64"));
  const file = `${base}.wav`;
  run("ffmpeg", ["-v", "error", "-y", "-f", "s16le", "-ar", "24000", "-ac", "1", "-i", pcm, file]);
  return { file };
}

async function placeholder(text, base) {
  const words = text.trim().split(/\s+/).length;
  const dur = Math.max(0.9, words * 0.36);
  const file = `${base}.wav`;
  run("ffmpeg", [
    "-v", "error", "-y", "-f", "lavfi", "-t", String(dur),
    "-i", `aevalsrc='0.35*abs(sin(PI*t*5.2))*(sin(2*PI*(150+25*sin(1.7*t))*t)+0.4*sin(2*PI*300*t))*min(1,t*20)*min(1,(${dur}-t)*20)':s=44100`,
    "-af", "lowpass=f=1400", file,
  ]);
  return { file };
}

export const PROVIDERS = { elevenlabs, gemini, placeholder };

/** Uniform character alignment over the voiced span (fallback lip-sync when a provider gives no timestamps). */
export function uniformAlignment(text, seconds) {
  const chars = [...text];
  const span = Math.max(0.2, seconds - 0.12);
  const step = span / chars.length;
  return {
    characters: chars,
    character_start_times_seconds: chars.map((_, i) => +(0.04 + i * step).toFixed(3)),
    character_end_times_seconds: chars.map((_, i) => +(0.04 + (i + 1) * step).toFixed(3)),
  };
}
