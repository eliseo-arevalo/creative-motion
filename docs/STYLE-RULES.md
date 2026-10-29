# Style rules

General rules for every video made with this toolkit. They come from many review rounds with the owner; they are about craft and process, not about any brand. Brand-specific rules (tone, forbidden claims, names) belong in the brand's own folder.

Numbers assume 1080×1920 at 30 fps (vertical). Scale them for other formats.

## Layout and text

1. **No eyebrows.** No small pre-title line above a headline. The headline stands alone.
2. **Big text, readable on a phone.** Essential text is at least 40 px (headlines 90–110 px). If you have to squint at a preview scaled to phone size, it is too small.
3. **Safe zone for TikTok / Reels / Shorts.** Keep everything essential inside x = 80–1000 and y = 160–1640. The platform UI covers the top ~160 px, the bottom ~250 px and the right ~200 px; decoration may bleed, copy and QR codes may not.
4. **Short copy.** One idea per scene, a headline of at most ~6 words per line and 3 lines. If it needs a paragraph, cut it.
5. **No emoji fonts.** Draw icons as SVG so renders look the same on every machine.
6. **Transitions are wipes or geometric masks.** Avoid fades as the main transition.

## Story and pacing

7. **A long problem beat.** Let the problem be felt before the solution appears. The worried person does **not** smile; a happy or neutral face under stress reads wrong (the `faceFor` helper in the sketch template shows how).
8. **The narration keeps going over the solution.** The voice does not stop when the product appears; each solution beat has its own line.
9. **One screen action at a time.** In product demos: the camera is still while something happens, every click shows its result in the same frame, few zooms. `screen-kit-lint` enforces this ([`USABILITY-VIDEOS.md`](USABILITY-VIDEOS.md)).
10. **Closing card, centred.** A **big QR code**, a **big store badge / CTA button**, **small** social handles, everything on the vertical centre axis and inside the safe zone. The brand line goes above, small. The QR points to a link that really exists; never promise something the product does not do yet.

## Sound

11. **Subtle music.** A bed that supports the voice, ducked under it (~−11 dB) and quieter under SFX. No cartoon effects (no boing, slide whistle, sad trombone) unless the video is explicitly a cartoon.
12. **Voice first.** Every scene is timed to a measured voice line (`voManifest.ts` frames come from the real audio). Re-measure after any change of voice or text.
13. **Deliver only the version with audio.** A silent or "no music" cut can exist for internal use, but what the user receives, approves and publishes is the mastered version with audio (−14.5 LUFS, limiter, AAC 192k 48 kHz). Check it with `ffprobe` before delivering.
14. **Licences or it does not ship.** Third-party music/SFX only with a licence that allows your use; synthesised audio from this repo's scripts is always safe. See [`AUDIO.md`](AUDIO.md).

## Characters

15. Natural arms and hands (never an elbow inside the body), no bald patches in 3/4 turns, natural walk. If in doubt, run the character-kit tests and look at frames, not only at the MP4.

## Process

16. **Review frames, not only the video.** Render stills at the key frames (cuts, text, last frame) and check them against this list before rendering the full video.
17. **Approval before commit.** Never commit or push without the user's explicit approval in their own words. Show the video (or the diff) first, ask a concrete question ("approve the commit?"), wait.
18. **Few commits, in English, Conventional Commits.** One commit per logical change: `feat(templates): …`, `fix(character-kit): …`, `docs: …`, `chore: …`. No "wip" commits, no commit spam.
19. **Do not touch work that is not yours.** Fetch/pull before you start; if the working tree has changes you did not make, leave them alone and say so.
20. **Versions, not overwrites.** Feedback produces the next version (`-r2`, `-r3`); previous versions stay.
21. **Keep secrets out.** API keys live in the environment or in a git-ignored `.env`; never in the repo, logs or chat. Say how many credits/characters you expect to spend before spending them.
22. **Keep the repo brand-free.** No logos, brand copy, brand voices or brand music in this repo. If a reusable idea came from a brand video, generalise it first.
