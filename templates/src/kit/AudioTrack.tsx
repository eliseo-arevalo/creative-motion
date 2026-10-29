import { Html5Audio, interpolate, Sequence, staticFile } from "remotion";

export type AudioCue = {
  name: string;
  src: string;
  at: number;
  frames: number;
  volume?: number;
  kind: "vo" | "sfx";
};

/**
 * Music bed + VO + SFX with programmed ducking (same recipe as the v5 mix):
 * VO ducks the bed strongly (8f attack, hold, 18f release), SFX lightly.
 */
export const AudioTrack: React.FC<{
  /** Music bed; null = voice + SFX only (e.g. a cut for adding a trending sound in-app). */
  music: string | null;
  duration: number;
  cues: AudioCue[];
  musicGain?: number;
  voDucked?: number;
  sfxDucked?: number;
  fadeOutFrames?: number;
}> = ({ music, duration, cues, musicGain = 0.55, voDucked = 0.28, sfxDucked = 0.6, fadeOutFrames = 75 }) => {
  const vo = cues.filter((c) => c.kind === "vo");
  const sfx = cues.filter((c) => c.kind === "sfx");
  const duck = (frame: number) =>
    Math.min(
      1,
      ...vo.map(({ at, frames }) =>
        interpolate(frame, [at - 8, at, at + frames + 3, at + frames + 21], [1, voDucked, voDucked, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
      ),
      ...sfx.map(({ at, frames }) =>
        interpolate(frame, [at - 4, at, at + frames * 0.6, at + frames * 0.6 + 14], [1, sfxDucked, sfxDucked, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
      ),
    );
  const tail = (frame: number) =>
    interpolate(frame, [duration - fadeOutFrames, duration - 1], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <>
      {music && (
        <Sequence name="Música" durationInFrames={duration} layout="none">
          <Html5Audio src={staticFile(music)} volume={(f) => musicGain * duck(f) * tail(f)} />
        </Sequence>
      )}
      {cues.map((c, i) => (
        <Sequence key={`${c.name}-${i}`} name={`${c.kind.toUpperCase()} · ${c.name}`} from={c.at} durationInFrames={c.frames} layout="none">
          <Html5Audio src={staticFile(c.src)} volume={c.volume ?? 1} />
        </Sequence>
      ))}
    </>
  );
};
