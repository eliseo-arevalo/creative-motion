# creative-motion

Open toolkit for producing polished short videos with [Remotion](https://www.remotion.dev): reusable engines, generic templates, audio scripts and the know-how (workflow + style rules) to use them. It contains **no brand**: no logos, no brand copy, no brand voices or music. Brands live outside this repo (see [Brands](#brands)).

If you are a bot or a person starting from zero, this README is enough: clone this repo only, follow [Setup](#setup), run the [smoke test](#smoke-test), then read [`docs/WORKFLOW.md`](docs/WORKFLOW.md) and [`docs/STYLE-RULES.md`](docs/STYLE-RULES.md).

## What is inside

| Path | What it is |
|---|---|
| `packages/motion-kit` | Brand-agnostic motion primitives (wipes, reveals, formats). |
| `packages/screen-kit` | Product/usability videos from a real web UI: Playwright capture + virtual camera, cursor, click frames, callouts + a narrative lint. |
| `packages/character-kit` | 2D SVG character rig for Remotion: poses, gait, hands, hair, faces, 3/4 turns, lip-sync (Rhubarb or TTS timestamps). |
| `templates/` | Ready-to-render, brand-neutral compositions: `PromoVertical` (feature promo), `ReelProblemSolution` (reel), `SketchCharacters` (sketch with talking characters), `EndCardDemo` (QR + store badge end card, also a component). Plus the audio pipeline. |
| `examples/demo-usability` | Screen tour (screen-kit): capture a site, lint the story, render. |
| `examples/demo-wipes` | motion-kit sample. |
| `brands/demo`, `brands/_template` | A neutral example brand (colours, fonts, name, store link) and the template for a real one. |
| `docs/` | Workflow, style rules, templates, audio, characters, Rhubarb, delivery, usability rules. |
| `scripts/smoke.sh` | One command that proves the whole toolchain works on this machine. |

## Setup

Requirements: Node 18+ (tested on 22) and npm 10+, `ffmpeg` and `ffprobe` (with `loudnorm`, `sidechaincompress`, `aevalsrc`), `python3`, a Chromium for Remotion (it downloads one on first render, or set `REMOTION_BROWSER_EXECUTABLE`). Optional: [Rhubarb](docs/RHUBARB.md) for character lip-sync, Playwright browsers for screen tours (`npx playwright install chromium`).

```bash
git clone https://github.com/eliseo-arevalo/creative-motion.git
cd creative-motion
npm install
cp .env.example .env        # optional: add keys to generate a real voice (no keys needed to render)
```

## Smoke test

```bash
scripts/smoke.sh            # typecheck + tests + audio + short render of every template + ffprobe checks (~5 min)
scripts/smoke.sh --quick    # typecheck + audio + one still per template (~1 min)
scripts/smoke.sh --tour     # also capture and render the screen tour (needs network and Playwright Chromium)
```

## Make a video, end to end

```bash
cd templates
npm run audio -- all                      # voice (placeholder/ElevenLabs/Gemini), SFX, music, manifests, lip-sync
npm run studio                            # preview in Remotion Studio
npm run render -- ReelProblemSolution --out=out/reel.mp4          # quick render
npm run master -- ReelProblemSolution out/reel-final.mp4          # final: render + loudness master (-14.5 LUFS)
```

To make *your* video: copy a template folder, change `content.ts` (copy), `audio/<name>.json` (voice lines) and the scenes, set your brand (`npm run brand -- <id>`), regenerate the audio, review stills, then master. Details and rules: [`docs/WORKFLOW.md`](docs/WORKFLOW.md), [`docs/TEMPLATES.md`](docs/TEMPLATES.md), [`docs/STYLE-RULES.md`](docs/STYLE-RULES.md).

## Brands

The kit is brand-agnostic. A brand is data (`brand.json`: name, tagline, handle, store URL; `tokens.ts`: colours and fonts; optional logo files). Keep real brands in a private repo or in a git-ignored `brands/private-<id>/` folder and activate one with `npm run brand -- <id>`. Never commit a real logo, brand copy, brand voice or brand music here.

## Rules that matter most

1. Nothing ships without the user's approval; commits happen only after explicit approval and are few, in English, [Conventional Commits](https://www.conventionalcommits.org).
2. Deliver only the version **with audio**.
3. Follow [`docs/STYLE-RULES.md`](docs/STYLE-RULES.md) (big text, safe zone, no eyebrows, a long problem beat, narration over the solution, centred closing with big QR/CTA, subtle music).
4. Third-party audio only with a licence that allows it; see [`docs/AUDIO.md`](docs/AUDIO.md) and [`licenses/`](licenses/README.md).

Remotion 4.0.529, React 19.2.3, TypeScript 5.9.3, Playwright 1.64.0 are pinned across all packages.
