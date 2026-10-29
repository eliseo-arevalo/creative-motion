# Delivery and approval

General process; a given owner can add their own storage conventions on top.

1. **Naming.** `<project>-<video>-r<N>.mp4` for review rounds (`-r1`, `-r2`…). Never overwrite a previous round. The approved one becomes the final.
2. **Only with audio.** Verify before sending: `ffprobe -v error -show_entries stream=codec_type,codec_name,width,height -of csv=p=0 file.mp4` shows `h264` video at the expected size and an `aac` audio stream; mean loudness ≈ −14.5 LUFS.
3. **Size.** Shareable in chat ≲ 16 MB (H.264 + AAC, CRF 18–23). Keep a higher-quality copy if the user asks.
4. **Message.** Say what the video is, its length, what changed since the last round, what is pending, and ask one concrete question ("approve for publishing?").
5. **Inventory.** Keep a list (spreadsheet or markdown) with: project, name, what it is, duration, format, audio yes/no, location, decision (draft / final / discarded), notes. Update it whenever a file is uploaded or a decision is made.
6. **Folders.** Typical layout in a shared drive: `Finals/`, `Versions/` (earlier rounds), `Tests/`. Upload only when asked or when it is part of the job.
7. **Git.** Source changes are committed only after the user approves, with their own words. Few commits, English, Conventional Commits; report hash, branch, what changed and where the video is. Videos (`*.mp4`) are not committed.
8. **Privacy.** Do not put keys, voice files from paid providers, or brand assets in the repo or in public places.
