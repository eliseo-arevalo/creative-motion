# Rhubarb lip-sync

[Rhubarb Lip Sync](https://github.com/DanielSWolf/rhubarb-lip-sync) (MIT) turns a voice file into mouth shapes. character-kit consumes its cues (`A`–`H`, `X`; with `--extendedShapes GHX`). Without Rhubarb the sketch falls back to the TTS provider's character timestamps (ElevenLabs), or to a uniform guess (`--lipsync=uniform`).

## Install (Linux x64)

```bash
mkdir -p ~/.local/opt && cd ~/.local/opt
curl -L -o rhubarb.zip https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v1.14.0/Rhubarb-Lip-Sync-1.14.0-Linux.zip
unzip rhubarb.zip && ln -sf "$PWD/Rhubarb-Lip-Sync-1.14.0-Linux/rhubarb" ~/.local/bin/rhubarb
rhubarb --version          # 1.14.x; macOS/Windows builds are on the same release page
```
Keep the bundled `res/` folder next to the binary. Set `RHUBARB=/path/to/rhubarb` if it is not in `PATH`.

## Use

Automatic: `npm run audio -- sketch --lipsync=rhubarb` (the default when Rhubarb is installed) writes `src/sketch/lipsync.json` from each voice line.

By hand: `packages/character-kit/scripts/lipsync.sh line.wav out.json` (uses the phonetic recognizer, works for non-English audio). Pass the cues to `<Character mouth={cues}/>` as in `src/sketch/lipsync.ts`.
