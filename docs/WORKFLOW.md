# Workflow: from brief to delivered video

The steps are the same for a promo, a reel, a sketch or a screen tour. Everything below can be done with only this repository.

## 0. Setup and smoke test

`npm install`, then `scripts/smoke.sh --quick`. If it fails, fix the machine first (see [README](../README.md#setup)).

## 1. Brief

Agree with the user, in a few lines: goal, format (vertical 1080×1920 for social, 1920×1080 for product tours, 30 fps), length (reels 20–45 s, tours 20–40 s), the story in one sentence, the call to action, the language and the voice. Ask once, briefly, if something is unclear.

## 2. Pick the closest template

| Goal | Template | Notes |
|---|---|---|
| Feature promo, several features, adaptive timing | `PromoVertical` | Scene lengths follow the voice lines. |
| Short problem → solution reel | `ReelProblemSolution` | Fixed shots timed to the narration. |
| Sketch / humour / people talking | `SketchCharacters` | Uses `character-kit`, lip-sync. |
| Product / usability tour from a real web UI | `screen-kit` (`examples/demo-usability`) | Capture + lint + render. |
| Only a closing card | `EndCardDemo` / `BrandEndCard` | Big QR, badge, small socials. |

Details of each: [`TEMPLATES.md`](TEMPLATES.md).

## 3. Brand

Use the demo brand to prototype. For a real brand, create `brands/private-<id>/` (or a private repo) from `brands/_template/` and run `npm run brand -- <id>` in `templates/`. Brand data is only: name, tagline, handle, store URL, colours, fonts, optional logo files.

## 4. Copy and voice lines

Write the story as short lines. Put on-screen copy in the template's `content.ts` and spoken lines in `templates/audio/<template>.json` (`{name}` is replaced by the brand's pronunciation). Rules for both: [`STYLE-RULES.md`](STYLE-RULES.md). Keep each spoken line to one breath.

## 5. Audio

```bash
cd templates
npm run audio -- <promo|reel|sketch|endcard|all> [--voice=elevenlabs|gemini|placeholder] [--lipsync=rhubarb|alignment|uniform]
```

This creates the voice files, synthetic SFX and music bed (git-ignored, in `public/audio/`), writes `voManifest.ts` with measured frame counts, and the lip-sync data for characters. Full details, licences and how to use better music/SFX: [`AUDIO.md`](AUDIO.md). Say how many characters you will send to the TTS before running it with a paid provider.

## 6. Build and preview

Edit scenes/timeline, then `npm run studio`. Cuts and beats that depend on words are in `timeline.ts` (comments say which word each frame is tied to). Change a line of text → re-run step 5 → check that the beats still land on the right words.

## 7. Review frames

```bash
npm run render -- <Id> --still=<frame> --scale=0.5
```

Check cuts, headline frames and the last frame against [`STYLE-RULES.md`](STYLE-RULES.md): size, safe zone, no eyebrows, face under stress, closing card centred. For tours run `screen-kit-lint`. For characters run the character-kit tests.

## 8. Final render and master

```bash
npm run master -- <Id> out/<name>-final.mp4
ffprobe -v error -show_entries stream=codec_type,codec_name,width,height,channels -of csv=p=0 out/<name>-final.mp4   # expect h264 + aac
```

Always check that the file has a video **and** an audio stream. Only the version with audio is delivered.

## 9. Deliver and ask for approval

Send the MP4 (shareable size: ≲ 16 MB, H.264 + AAC), say what changed and what is pending, and ask one concrete question. Follow [`DELIVERY.md`](DELIVERY.md). Do not commit before the user approves in their own words.

## 10. Commit (only after approval)

Few commits, English, Conventional Commits. Report hash, branch, what changed and the file path. Never push or merge without being asked.
