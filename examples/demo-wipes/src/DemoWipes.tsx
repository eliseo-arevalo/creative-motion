import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import {
  Check,
  Reveal,
  SceneWipe,
  Sticker,
  progress as motionProgress,
  type WipeKind,
} from "@eliseo-arevalo/motion-kit";

/** Paleta ficticia — no pertenece a ninguna marca real. */
const demo = {
  bg: "#0F172A",
  panel: "#1E293B",
  ink: "#F8FAFC",
  accent: "#38BDF8",
  muted: "#94A3B8",
} as const;

const KINDS: WipeKind[] = ["diagonal", "circle", "up", "side"];

/**
 * Ejemplo público: demuestra SceneWipe / Reveal / Sticker / Check
 * sin logos ni copy de marca real.
 */
export const DemoWipes: React.FC = () => {
  const frame = useCurrentFrame();
  const checkP = motionProgress(frame % 30, 6, 20);
  const kind = KINDS[Math.min(Math.floor(frame / 30), KINDS.length - 1)];

  return (
    <AbsoluteFill style={{ backgroundColor: demo.bg, overflow: "hidden" }}>
      <Sequence from={0} durationInFrames={36} name="intro">
        <AbsoluteFill
          style={{
            backgroundColor: demo.bg,
            color: demo.ink,
            padding: 80,
            justifyContent: "center",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <Reveal>
            <div style={{ fontSize: 64, fontWeight: 600, letterSpacing: "-0.03em" }}>
              Motion kit
            </div>
          </Reveal>
          <Reveal delay={6}>
            <div style={{ fontSize: 36, color: demo.muted, marginTop: 12 }}>
              Wipes geométricos · ejemplo demo
            </div>
          </Reveal>
        </AbsoluteFill>
      </Sequence>

      <Sequence from={24} durationInFrames={96} name="wipe-demo">
        <SceneWipe kind={kind} wipeFrames={24}>
          <AbsoluteFill
            style={{
              backgroundColor: demo.panel,
              color: demo.ink,
              alignItems: "center",
              justifyContent: "center",
              gap: 28,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            <Sticker delay={4} rotate={-2}>
              <div
                style={{
                  fontSize: 28,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: demo.accent,
                }}
              >
                wipe · {kind}
              </div>
            </Sticker>
            <Check progress={checkP} color={demo.accent} size={72} />
            <div style={{ fontSize: 22, color: demo.muted }}>
              SceneWipe · Reveal · Sticker · Check
            </div>
          </AbsoluteFill>
        </SceneWipe>
      </Sequence>
    </AbsoluteFill>
  );
};
