import { AbsoluteFill, Sequence } from "remotion";
import { AudioTrack, type AudioCue } from "../kit/AudioTrack";
import { Transition, type TransitionKind } from "../kit/Transition";
import { colors } from "../tokens";
import { EndScene, HookScene, ProblemScene, ReliefScene, SolutionScene } from "./scenes";
import { DURATION, end, hook, narr, problem, relief, scenes, solution, vo as ownerVo, WIPE, type SceneId } from "./timeline";
import { voManifest } from "./voManifest";

const SCENES: Record<SceneId, { name: string; Component: React.FC; wipe?: TransitionKind; band?: string; origin?: { x: number; y: number }; frames?: number }> = {
  hook: { name: "1 · Hook: busy shop day", Component: HookScene },
  problem: { name: "2 · Problem: where is the record?", Component: ProblemScene },
  solution: { name: "3 · App: sale, fiado, day total", Component: SolutionScene, wipe: "circle", band: colors.primary, origin: { x: 50, y: 55 } },
  relief: { name: "4 · Relief: shutter down", Component: ReliefScene, wipe: "up", band: colors.accent, frames: 20 },
  end: { name: "5 · End card (QR + badge)", Component: EndScene, wipe: "pill", origin: { x: 50, y: 50 } },
};

const A = (f: string) => `audio/reel/${f}.wav`;
const TAP = "audio/reel/sfx-soft-click.wav";
const sfx = (name: string, file: string, at: number, frames: number, volume = 0.7): AudioCue => ({ name, src: file.startsWith("audio/") ? file : A(file), at, frames, volume, kind: "sfx" });

const vo = (key: keyof typeof voManifest, at: number): AudioCue => ({ name: key, src: voManifest[key].src, at, frames: voManifest[key].frames, kind: "vo" });

const S = scenes;
const IDS = Object.keys(S) as SceneId[];
const sol = solution;
const out = S.relief.from + relief.outsideAt;

const cues: AudioCue[] = [
  // Hook: shop bell, scanner beep, cash, change.
  sfx("timbre", "sfx-door-bell", 0, 40, 0.35),
  sfx("escáner", "sfx-scanner", hook.scanAt, 15, 0.3),
  ...hook.shots.slice(1).map((at) => sfx(`corte ${at}`, "sfx-whoosh", at - 3, 14, 0.35)),
  vo("vendes", narr.at),
  sfx("billete", "sfx-papers", hook.billAt, 18, 0.5),
  sfx("vuelto", "sfx-coins", hook.coinsAt, 30, 0.7),
  sfx("fiado", "sfx-scribble", hook.fiadoAt + 8, 20, 0.6),
  ...hook.rush.map((at, i) => sfx(`venta ${i + 1}`, i % 2 ? "sfx-coins" : "sfx-scanner", at, i % 2 ? 30 : 15, i % 2 ? 0.6 : 0.3)),
  ...hook.rush.filter((_, i) => i % 2 === 0).map((at) => sfx("caja", "sfx-coins", at + 4, 30, 0.5)),
  sfx("papelitos", "sfx-papers", hook.papersAt, 30, 0.55),
  // Problem: papers fly in, the owner asks, tachones.
  sfx("papeles", "sfx-papers", S.problem.from + 4, 30, 0.65),
  sfx("arrugar", "sfx-crumple", S.problem.from + 18, 26, 0.5),
  vo("cuantoA", S.problem.from + ownerVo.q1),
  vo("cuantoB", S.problem.from + ownerVo.q2),
  sfx("tachones", "sfx-scribble", S.problem.from + problem.closeUpAt + 6, 30, 0.8),
  sfx("papel cae", "sfx-papers", S.problem.from + problem.worryAt + 10, 30, 0.25),
  // Solution: the switch to calm + taps on the phone.
  sfx("open app", "sfx-whoosh", S.solution.from - 4, 20, 0.45),
  sfx("logo app", "sfx-pop", S.solution.from + 6, 15, 0.3),
  // Narration over the solution, relief and close.
  vo("sale", S.solution.from + sol.sale.from + sol.sale.vo),
  vo("fiado", S.solution.from + sol.fiado.from + sol.fiado.vo),
  vo("total", S.solution.from + sol.total.from + sol.total.vo),
  vo("control", S.relief.from + relief.vo),
  vo("descarga", S.end.from + end.vo),
  ...sol.sale.addAt.map((at) => sfx("tap producto", TAP, S.solution.from + sol.sale.from + at, 15, 0.45)),
  sfx("tap cobrar", TAP, S.solution.from + sol.sale.from + sol.sale.chargeAt, 15, 0.55),
  sfx("cobrado", "sfx-coins", S.solution.from + sol.sale.from + sol.sale.chargeAt + 4, 30, 0.6),
  sfx("tap fiado", TAP, S.solution.from + sol.fiado.from + sol.fiado.switchAt, 15, 0.4),
  sfx("tap marta", TAP, S.solution.from + sol.fiado.from + sol.fiado.pickAt, 15, 0.55),
  sfx("tap confirmar", TAP, S.solution.from + sol.fiado.from + sol.fiado.confirmAt, 15, 0.55),
  sfx("fiado ok", "sfx-positive", S.solution.from + sol.fiado.from + sol.fiado.confirmAt + 4, 30, 0.5),
  sfx("total", "sfx-page", S.solution.from + sol.total.from, 20, 0.8),
  // Relief: notebook shut, shutter rolls down and lands.
  sfx("cerrar cuaderno", "sfx-page", S.relief.from + relief.closeAt + 6, 20, 1),
  sfx("cortina", "sfx-shutter", out + relief.shutterAt + 10, relief.landAt - relief.shutterAt - 8, 0.35),
  sfx("cortina tope", "sfx-slide-stop", out + relief.landAt - 2, 24, 1),
  // End.
  sfx("logo", "sfx-pop", S.end.from + end.at + 2, 15, 0.35),
  sfx("cta", "sfx-positive", S.end.from + end.at + 30, 30, 0.4),
];

export const reelVendesCues = cues;

export const ReelProblemSolution: React.FC<{ withMusic?: boolean }> = ({ withMusic = true }) => (
  <AbsoluteFill style={{ backgroundColor: colors.paper, overflow: "hidden" }}>
    <AudioTrack music={withMusic ? "audio/reel/music-bed.wav" : null} duration={DURATION} cues={cues} musicGain={0.8} fadeOutFrames={45} />
    {IDS.map((id, i) => {
      const { name, Component, wipe, band, origin, frames } = SCENES[id];
      // Keep each scene alive under the next one's wipe so the wipe reveals over it.
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

export const ReelProblemSolutionNoMusic: React.FC = () => <ReelProblemSolution withMusic={false} />;
