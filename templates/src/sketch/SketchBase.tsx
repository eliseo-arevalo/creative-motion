import { AbsoluteFill, Sequence } from "remotion";
import { AudioTrack, type AudioCue } from "../kit/AudioTrack";
import { Transition, type TransitionKind } from "../kit/Transition";
import { colors } from "../tokens";
import { ChaosScene, EndScene, HookScene, NightScene, RedoScene, RewindScene } from "./scenes";
import { chaos, DURATION, hook, night, redo, sale, scenes, WIPE, type SceneId } from "./timeline";
import { voManifest } from "./voManifest";

// Hard cuts are the sketch's grammar (chaos → night → rewind → redo); only the close gets a wipe.
const SCENES: Record<SceneId, { name: string; Component: React.FC; wipe?: TransitionKind; band?: string; origin?: { x: number; y: number }; frames?: number }> = {
  hook: { name: "1 · Hook: \"later\"", Component: HookScene },
  chaos: { name: "2 · Chaos: unrecorded sales pile up", Component: ChaosScene },
  night: { name: "3 · Night: the missing $3", Component: NightScene },
  rewind: { name: "4 · Rewind", Component: RewindScene },
  redo: { name: "5 · Redo: two taps", Component: RedoScene },
  end: { name: "6 · End card (tag a friend)", Component: EndScene, wipe: "pill", origin: { x: 50, y: 50 } },
};

const A = (f: string) => `audio/sketch/${f}.wav`;
const TAP = "audio/sketch/sfx-soft-click.wav";
const sfx = (name: string, file: string, at: number, frames: number, volume = 0.7): AudioCue => ({ name, src: file.startsWith("audio/") ? file : A(file), at, frames, volume, kind: "sfx" });
const vo = (key: keyof typeof voManifest, at: number): AudioCue => ({ name: key, src: voManifest[key].src, at, frames: voManifest[key].frames, kind: "vo" });

const S = scenes;
const IDS = Object.keys(S) as SceneId[];
const C = S.chaos.from;
const R = S.redo.from;

const cues: AudioCue[] = [
  // Hook: the bell as the customer walks up, the bill, the line, the bell as they leave.
  sfx("timbre entra", "sfx-door-bell", 0, 40, 0.35),
  sfx("billete", "sfx-papers", sale.grabAt - 2, 14, 0.4),
  vo("anoto", hook.vo),
  sfx("timbre sale", "sfx-door-bell", hook.bellAt, 40, 0.3),
  // Chaos: tick-tock speeding up, a pop per unnoted sale, phone, kid, cash, cuts.
  sfx("tic-tac", "sfx-ticks", C, S.chaos.duration, 0.55),
  ...chaos.tally.map((at, i) => sfx(`venta ${i + 1}`, "sfx-pop", C + at, 7, 0.3 + i * 0.03)),
  ...chaos.shots.slice(1).map((at) => sfx(`corte ${at}`, "sfx-whoosh", C + at - 3, 14, 0.3)),
  sfx("caja", "sfx-coins", C + 18, 30, 0.45),
  sfx("ringtone", "sfx-ringtone", C + chaos.ringAt, chaos.answerAt - chaos.ringAt + 2, 0.45),
  sfx("niño", "sfx-giggle", C + chaos.kidAt + 2, 30, 0.35),
  sfx("ringtone 2", "sfx-ringtone", C + chaos.shots[3], S.chaos.duration - chaos.shots[3], 0.35),
  sfx("caja 2", "sfx-coins", C + chaos.shots[3] + 10, 30, 0.4),
  sfx("papeles", "sfx-papers", C + chaos.shots[3] + 4, 30, 0.45),
  // Night: record scratch on the cut, the line, crickets on the deadpan stare.
  sfx("scratch", "sfx-scratch", S.night.from - 2, 30, 0.7),
  vo("remate", S.night.from + night.vo),
  ...night.cricketAt.map((at) => sfx("grillo", "sfx-cricket", S.night.from + at, 20, 0.6)),
  // Rewind.
  sfx("rebobinar", "sfx-rewind", S.rewind.from - 2, S.rewind.duration + 6, 0.6),
  // Redo: same bell/bill, then two taps and the ding.
  sfx("timbre entra 2", "sfx-door-bell", R, 40, 0.3),
  sfx("billete 2", "sfx-papers", R + sale.grabAt - 2, 14, 0.4),
  sfx("abrir", "sfx-whoosh", R + redo.closeUp - 4, 16, 0.35),
  sfx("tap 1", TAP, R + redo.pickAt, 15, 0.6),
  sfx("tap 2", TAP, R + redo.chargeAt, 15, 0.6),
  sfx("ding", "sfx-ding", R + redo.chargeAt + 4, 44, 0.75),
  vo("listo", R + redo.vo),
  sfx("timbre sale 2", "sfx-door-bell", R + redo.handOut + 4, 40, 0.28),
  // End.
  sfx("logo", "sfx-pop", S.end.from + 4, 7, 0.35),
  sfx("mano", "sfx-pop", S.end.from + 32, 7, 0.3),
];

export const reelAnotoCues = cues;

export const SketchBase: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: colors.paper, overflow: "hidden" }}>
    <AudioTrack music="audio/sketch/music-bed.wav" duration={DURATION} cues={cues} musicGain={0.8} fadeOutFrames={40} />
    {IDS.map((id, i) => {
      const { name, Component, wipe, band, origin, frames } = SCENES[id];
      const next = IDS[i + 1] ? SCENES[IDS[i + 1]] : undefined;
      const overlap = next?.wipe ? (next.frames ?? WIPE) : 0;
      return (
        <Sequence key={id} name={name} from={S[id].from} durationInFrames={S[id].duration + overlap}>
          {wipe ? (
            <Transition kind={wipe} frames={frames ?? WIPE} band={band} origin={origin}>
              <Component />
            </Transition>
          ) : (
            <Component />
          )}
        </Sequence>
      );
    })}
  </AbsoluteFill>
);
