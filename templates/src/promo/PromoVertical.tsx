import { AbsoluteFill, Sequence } from "remotion";
import { AudioTrack, type AudioCue } from "../kit/AudioTrack";
import { Transition, type TransitionKind } from "../kit/Transition";
import { colors } from "../tokens";
import { AbonoPromo, EndPromo, FiadoPromo, GastoPromo, HookPromo, ProblemPromo, ProveedoresPromo, ResumenPromo, SalePromo } from "./scenes";
import { beats, promo, WIPE, type SceneId, type PromoScene } from "./timeline";
import { voManifest } from "./voManifest";

const SCENES: Record<SceneId, { name: string; Component: React.FC<{ scene: PromoScene }>; wipe: TransitionKind; band?: string; origin?: { x: number; y: number } }> = {
  hook: { name: "1 · Hook", Component: HookPromo, wipe: "up" },
  problem: { name: "2 · Problem", Component: ProblemPromo, wipe: "diagonal", band: colors.accent },
  sale: { name: "3 · Sale: ticket and charge", Component: SalePromo, wipe: "pill", origin: { x: 68, y: 88 } },
  fiado: { name: "4 · Credit sale (fiado)", Component: FiadoPromo, wipe: "side", band: colors.accent },
  abono: { name: "5 · Payment received", Component: AbonoPromo, wipe: "up", band: colors.primary },
  gasto: { name: "6 · Expense", Component: GastoPromo, wipe: "circle", band: colors.accent, origin: { x: 68, y: 62 } },
  proveedores: { name: "7 · Suppliers", Component: ProveedoresPromo, wipe: "diagonal", band: colors.primary },
  resumen: { name: "8 · Weekly summary", Component: ResumenPromo, wipe: "side", band: colors.primary },
  end: { name: "9 · Brand end card", Component: EndPromo, wipe: "pill", origin: { x: 50, y: 50 } },
};

const TAP = "audio/promo/sfx-soft-click.wav";
const g = promo.toGlobal;

const cues: AudioCue[] = [
  // Voice: every phrase at its timeline slot.
  ...promo.scenes.flatMap((s) =>
    s.phrases.map((p) => ({ name: p.key, src: voManifest[p.key as keyof typeof voManifest].src, at: s.from + p.at, frames: p.frames, kind: "vo" as const })),
  ),
  // Wipes.
  ...promo.scenes.slice(1).map((s) => ({ name: `wipe ${s.id}`, src: "audio/promo/sfx-wipe.wav", at: s.from, frames: 24, volume: 0.7, kind: "sfx" as const })),
  // Taps and payoffs, from the same beats the visuals use.
  ...(() => {
    const sale = beats.sale(promo.byId.sale);
    const fiado = beats.fiado(promo.byId.fiado);
    const abono = beats.abono(promo.byId.abono);
    const gasto = beats.gasto(promo.byId.gasto);
    const prov = beats.proveedores(promo.byId.proveedores);
    const res = beats.resumen(promo.byId.resumen);
    const tap = (id: SceneId, at: number, volume = 0.55): AudioCue => ({ name: `tap ${id}`, src: TAP, at: g(id, at), frames: 15, volume, kind: "sfx" });
    return [
      ...sale.addAt.map((at) => tap("sale", at, 0.45)),
      tap("sale", sale.chargeAt),
      { name: "cobrado", src: "audio/promo/sfx-coins.wav", at: g("sale", sale.chargeAt + 4), frames: 30, volume: 0.75, kind: "sfx" as const },
      tap("fiado", fiado.switchAt, 0.4),
      tap("fiado", fiado.pickAt),
      tap("fiado", fiado.confirmAt),
      tap("abono", abono.pressAt),
      { name: "abono coins", src: "audio/promo/sfx-coins.wav", at: g("abono", abono.pressAt + 2), frames: 30, volume: 0.8, kind: "sfx" as const },
      tap("gasto", gasto.switchAt, 0.4),
      tap("gasto", gasto.dateAt),
      tap("gasto", gasto.providerAt),
      tap("gasto", gasto.saveAt),
      { name: "más comprado", src: "audio/promo/sfx-balance.wav", at: g("proveedores", prov.highlightAt), frames: 30, volume: 0.6, kind: "sfx" as const },
      { name: "resumen", src: "audio/promo/sfx-notebook.wav", at: g("resumen", res.sheetAt - 6), frames: 25, volume: 0.8, kind: "sfx" as const },
      { name: "te quedó", src: "audio/promo/sfx-balance.wav", at: g("resumen", res.sheetAt + 30), frames: 36, volume: 0.8, kind: "sfx" as const },
    ];
  })(),
];

export const v6Cues = cues;

export const PromoVertical: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: colors.paper, overflow: "hidden" }}>
    <AudioTrack music="audio/promo/music-bed.wav" duration={promo.duration} cues={cues} />
    {promo.scenes.map((scene, i) => {
      const { name, Component, wipe, band, origin } = SCENES[scene.id];
      return (
        <Sequence key={scene.id} name={name} from={scene.from} durationInFrames={scene.duration}>
          {i === 0 ? (
            <Component scene={scene} />
          ) : (
            <Transition kind={wipe} frames={WIPE} band={band} origin={origin}>
              <Component scene={scene} />
            </Transition>
          )}
        </Sequence>
      );
    })}
  </AbsoluteFill>
);
