# Audio

Every template renders with sound on a clean machine and without any API key. Better voices and sounds are an upgrade, not a requirement.

```bash
cd templates
npm run audio -- all [--voice=elevenlabs|gemini|placeholder] [--lipsync=rhubarb|alignment|uniform] [--sfx-dir=DIR] [--music=FILE] [--force]
```

Default voice: ElevenLabs if `ELEVENLABS_API_KEY` **and** `ELEVENLABS_VOICE_ID` are set, else Gemini if `GEMINI_API_KEY` is set, else a placeholder voice (a synthesised murmur with a plausible length). Keys come from the environment or a git-ignored `.env` (see `.env.example`).

## What it produces (all git-ignored except the two generated TS/JSON files)

- `public/audio/<template>/*.wav`: one wav per voice line, SFX, and a music bed.
- `.cache/vo/`: raw provider output, so a re-run never pays twice. `--force` re-synthesises.
- `src/<template>/voManifest.ts`: measured frames per voice line (committed so a fresh clone type-checks; the file in git comes from the placeholder voice).
- `src/sketch/lipsync.json`: mouth cues (Rhubarb phonemes or provider alignment).

## Voice providers

| Provider | Needs | Notes |
|---|---|---|
| ElevenLabs | `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, optional `ELEVENLABS_MODEL` | Returns character timestamps, which feed lip-sync. Choose a voice you may use commercially; no voice is hard-coded. |
| Gemini TTS | `GEMINI_API_KEY`, optional `GEMINI_VOICE`, `GEMINI_TTS_MODEL`, `GEMINI_STYLE` | Occasionally returns no audio; the script retries 4×. Reads a bit slower than ElevenLabs; use `fit`. |
| placeholder | nothing | For layout, smoke tests and CI. Not for delivery. |

Tell the user the number of characters you will send before a paid run.

## SFX and music

- Default: synthesised with ffmpeg (`scripts/audio/synth.mjs`, 23 recipes: coins, bell, whoosh, paper, pop, click…, plus a soft music bed). They are ours, so they are redistributable and licence-free. They are intentionally simple.
- Better: `--sfx-dir=DIR` uses `DIR/<sfx-name>.(wav|mp3|ogg)` when present (names are in `audio/*.json`), and `--music=FILE` replaces the bed (trimmed/looped to length with a fade). Use only audio whose licence allows your use, and record it in `licenses/` (source URL, id, licence, date, sha256).
- Style: subtle bed, no cartoon effects ([STYLE-RULES](STYLE-RULES.md)). The bed ducks ~−11 dB under the voice.

## Mastering

`npm run master -- <CompositionId> out/<name>.mp4` renders the video and the mix, measures the integrated loudness of the **whole mix**, applies **one** gain to land at −14.5 LUFS, limits at ≈ −2.4 dBFS (AAC adds ~1.5 dB of inter-sample overs), and encodes AAC 192k 48 kHz with `+faststart`. The video stream is copied. If you make several versions of one video, pass the same `--gain=<dB>` to each so levels match.

`scripts/audio/add-audio.sh in.mp4 out.mp4 [--music=FILE] [--vo=line.wav@seconds …]` does the same for a silent video (screen tours).

## Licensing notes

- Do not commit third-party audio. Stock sites such as Mixkit forbid redistributing their SFX/music inside a template, tool or source repo; check each licence before using a file in a video and keep the evidence in `licenses/`.
- TTS output: check your provider's terms; a paid ElevenLabs plan covers commercial use of the audio inside a video, but standalone redistribution of the audio files is not allowed. Voice files are therefore generated at setup and not committed.
- Never commit `.env` or keys.
