import { createContext, useContext, type ReactNode } from "react";
import { AbsoluteFill, Freeze, interpolate, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { Canvas, Wordmark } from "../components/Layout";
import { Backdrop, type BackdropShape } from "../kit/Backdrop";
import { Camera, Parallax, type CameraKey } from "../kit/Camera";
import { BillSvg } from "../kit/Cash";
import { PointRight, StoreBadge } from "../kit/EndCard";
import { Kid } from "../kit/Kid";
import { drift, ease, springIn } from "../kit/motion";
import { Notebook } from "../kit/Notebook";
import { PaperNote } from "../kit/PaperNote";
import { Phone } from "../kit/Phone";
import { ReachArm } from "../kit/ReachArm";
import { RingingPhone } from "../kit/RingingPhone";
import { Rewind } from "../kit/Rewind";
import { QuickSaleScreen } from "../kit/screens/QuickSaleScreen";
import { Shake } from "../kit/Shake";
import { Shopkeeper, type PoseKey } from "../kit/Shopkeeper";
import { SocialIcon } from "../kit/SocialIcons";
import { SpeechBubble } from "../kit/SpeechBubble";
import { TallyBadge } from "../kit/TallyBadge";
import { clockMinute, WallClock } from "../kit/WallClock";
import { Headline, PopWords } from "../kit/Words";
import { colors, display, fonts } from "../tokens";
import { catalog, copy, money, notebook, PICK, rushCents } from "./content";
import { formatUSD } from "../kit/money";
import { chaos, end, hook, night, redo, rewind, sale, scenes } from "./timeline";

// Text safe zone: x 60–880 (≈200 px free on the right for the app's buttons), nothing key below y 1670.
const HEAD = { left: 64, width: 820, top: 170, size: 104 };
const NIGHT = "#1A2160";
const SLEEVES = ["#5B6FB0", "#8E5B9E", "#C9714A", "#3F8C8C", "#B0465B"];

const Head: React.FC<{ lines: readonly string[]; at: number; dark?: boolean; highlight?: string[]; size?: number; top?: number; nowrap?: boolean; lineGap?: number }> = ({ lines, at, dark, highlight, size = HEAD.size, top = HEAD.top, nowrap, lineGap = 3 }) => (
  <div style={{ position: "absolute", left: HEAD.left, width: HEAD.width, top, ...display, fontSize: size, lineHeight: 1.02, whiteSpace: nowrap ? "nowrap" : undefined, color: dark ? colors.paper : colors.ink }}>
    <Headline lines={lines} start={at} lineGap={lineGap} highlight={highlight} highlightColor={dark ? colors.accent : colors.primary} />
  </div>
);

const Scene: React.FC<{ background: string; dark?: boolean; camera: CameraKey[]; shapes?: BackdropShape[]; children: ReactNode }> = ({ background, dark, camera, shapes = [], children }) => (
  <Canvas background={background} dark={dark}>
    <Camera keys={camera}>
      <Backdrop shapes={shapes} />
      {children}
    </Camera>
  </Canvas>
);

export type TenderaProps = {
  left: number;
  top: number;
  width: number;
  poses: PoseKey[];
  holding?: (w: { x: number; y: number; angle: number }) => ReactNode;
  seed?: number;
  sighAt?: number;
  stressed?: boolean;
  /** The VO line she says here (scene frame). Only the character-kit variant lip-syncs it. */
  says?: { line: "anoto" | "remate" | "listo"; at: number };
};

/** Swaps the tendera's renderer (SketchCharacters uses character-kit). Default: the Shopkeeper. */
export const TenderaImpl = createContext<React.FC<TenderaProps> | null>(null);

/** The tendera in a px box (viewBox 900×820). */
const Tendera: React.FC<TenderaProps> = (props) => {
  const Impl = useContext(TenderaImpl);
  if (Impl) return <Impl {...props} />;
  const { left, top, width, poses, holding, seed, sighAt, stressed } = props;
  return (
    <div style={{ position: "absolute", left, top, width, height: (width * 820) / 900 }}>
      <Shopkeeper poses={poses} holding={holding} seed={seed} sighAt={sighAt} smileCap={stressed ? 0.05 : undefined} browMin={stressed ? 0.7 : undefined} />
    </div>
  );
};

/** A customer's arm from the right (or left), in at `at`, out at `out`, holding a bill or coins. */
const Customer: React.FC<{ at: number; out?: number; x: number; y: number; sleeve?: string; bill?: string | null; coin?: boolean; flip?: boolean; angle?: number; length?: number }> = ({ at, out, x, y, sleeve = SLEEVES[0], bill, coin, flip, angle = 4, length = 520 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const r = springIn(frame, at, fps, 12) * (out === undefined ? 1 : 1 - ease(frame, out, 12));
  if (r <= 0.001) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y + drift(frame, 30, 4) }}>
      <ReachArm reach={r} length={length} angle={angle} sleeve={sleeve} flip={flip}>
        {bill ? (
          <g transform="translate(-60 -18) rotate(-8)">
            <BillSvg label={bill} width={150} />
          </g>
        ) : null}
        {coin ? (
          <g transform="translate(-18 -16)">
            <circle r="20" fill={colors.accent} stroke={colors.ink} strokeWidth="5" />
            <circle cx="16" cy="-10" r="20" fill={colors.accent} stroke={colors.ink} strokeWidth="5" />
          </g>
        ) : null}
      </ReachArm>
    </div>
  );
};

// The counter shot, shared by the hook and the redo so the rewind lands on the exact same framing.
const SHOT = { left: -150, top: 720, width: 1100 };
const HAND = { x: 930, y: 1250 };

/** The $3 bill in her hand (viewBox space), shrinking away as she tucks it into the apron pocket. */
const heldBill = (frame: number, from: number, goneAt?: number) => (w: { x: number; y: number }) => {
  if (frame < from) return null;
  const s = goneAt === undefined ? 1 : 1 - ease(frame, goneAt, 8);
  if (s <= 0.01) return null;
  return (
    <g transform={`translate(${w.x - 6} ${w.y - 10}) rotate(-14) scale(${s})`}>
      <BillSvg label={money.lost} width={110} />
    </g>
  );
};

// 1 · Hook: the customer pays $3 and leaves; she stashes the bill. "Sí, sí… ahorita lo anoto, va." ──
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const poses: PoseKey[] = [
    { at: 0, pose: "idle" },
    { at: sale.takeAt, pose: "give" },
    { at: hook.pocketAt, pose: "pocket" },
    { at: hook.pocketAt + 26, pose: "wave" },
    { at: hook.pocketAt + 44, pose: "idle" },
  ];
  return (
    <Scene background={colors.paper} camera={[{ at: 0, scale: 1.0 }, { at: scenes.hook.duration, scale: 1.05, y: -10 }]} shapes={[{ kind: "blob", x: 880, y: 1480, size: 560, color: colors.accentSoft, depth: 0.3 }]}>
      <Parallax depth={0.9}>
        <Tendera {...SHOT} poses={poses} holding={heldBill(frame, sale.grabAt, hook.pocketAt + 10)} says={{ line: "anoto", at: hook.vo }} />
      </Parallax>
      <Parallax depth={1.1}>
        <Customer at={sale.handIn} out={sale.handOut} {...HAND} bill={frame < sale.grabAt ? money.lost : null} />
      </Parallax>
      <SpeechBubble at={hook.bubbleAt} tail={250} style={{ left: 150, top: 590 }}>
        {copy.bubble}
      </SpeechBubble>
      <Head lines={copy.hook} at={hook.headAt} highlight={["“después", "lo", "apunto”…"]} nowrap />
    </Scene>
  );
};

// 2 · Chaos: more customers, the phone, a kid… the unnoted sales pile up, the clock speeds up. ──────
export const ChaosScene: React.FC = () => {
  const frame = useCurrentFrame();
  const [a, b, c, d, d2, d3] = chaos.shots;
  const kicks = chaos.shots.slice(1).map((at) => ({ at, amount: 16 + at / 8 })).concat(chaos.tally.slice(1).map((at) => ({ at, amount: 7 })));
  const minute = clockMinute(frame, 0, 4, 0.12);
  const frenzy = ease(frame, d, 30);
  // Punch-ins on the frenzy micro-cuts.
  const cam: CameraKey[] = [
    { at: 0, scale: 1.0 },
    { at: d - 1, scale: 1.03 },
    { at: d, scale: 1.06 },
    { at: d2 - 1, scale: 1.08 },
    { at: d2, scale: 1.16, y: 40, rotate: -1.5 },
    { at: d3 - 1, scale: 1.18, y: 40, rotate: -1.5 },
    { at: d3, scale: 1.28, y: 80, rotate: 2 },
    { at: scenes.chaos.duration, scale: 1.32, y: 80, rotate: 2.5 },
  ];
  const phonePoses = (ans: number): PoseKey[] => [
    { at: 0, pose: "point" },
    { at: ans, pose: "phone" },
  ];
  return (
    <Scene background={colors.paper} camera={cam} shapes={[{ kind: "blob", x: 880, y: 1480, size: 560, color: colors.accentSoft, depth: 0.3 }]}>
      <Shake kicks={kicks} base={1 + frenzy * 5}>
        {/* A · two customers at once, one each side. */}
        <Sequence from={a} durationInFrames={b - a} layout="none">
          <Parallax depth={0.9}>
            <Tendera {...SHOT} seed={2} stressed poses={[{ at: 0, pose: "give" }, { at: 16, pose: "point" }, { at: 24, pose: "give" }]} holding={(w) => <g transform={`translate(${w.x + 4} ${w.y - 14})`}><circle r="14" fill={colors.accent} stroke={colors.ink} strokeWidth="4" /></g>} />
          </Parallax>
          <Parallax depth={1.1}>
            <Customer at={0} out={20} {...HAND} sleeve={SLEEVES[1]} bill={formatUSD(rushCents[0])} />
            <Customer at={10} x={150} y={1300} flip sleeve={SLEEVES[2]} coin angle={-4} />
            <Customer at={20} x={HAND.x} y={HAND.y - 30} sleeve={SLEEVES[3]} bill={formatUSD(rushCents[1])} />
          </Parallax>
        </Sequence>
        {/* B · the phone rings; she answers while still serving. */}
        <Sequence from={b} durationInFrames={c - b} layout="none">
          <Parallax depth={0.9}>
            <Tendera {...SHOT} seed={5} stressed poses={phonePoses(chaos.answerAt - b)} />
          </Parallax>
          <Parallax depth={1.1}>
            {frame < chaos.answerAt && (
              <div style={{ position: "absolute", left: 130, top: 1330, transform: "rotate(-14deg)" }}>
                <RingingPhone frame={frame} ringAt={chaos.ringAt} width={130} />
              </div>
            )}
            <Customer at={4} {...HAND} sleeve={SLEEVES[4]} bill={formatUSD(rushCents[2])} />
          </Parallax>
          <SpeechBubble at={chaos.answerAt - b + 4} tail={240} style={{ left: 330, top: 640 }}>
            {copy.phone}
          </SpeechBubble>
        </Sequence>
        {/* C · a kid pops up over the counter: "¡Seño, un chicle!" */}
        <Sequence from={c} durationInFrames={d - c} layout="none">
          <Parallax depth={0.9}>
            <Tendera {...SHOT} seed={7} stressed poses={[{ at: -40, pose: "phone" }]} />
          </Parallax>
          <Parallax depth={1.15}>
            <Customer at={0} x={HAND.x} y={HAND.y - 40} sleeve={SLEEVES[0]} coin />
            <div style={{ position: "absolute", left: 470, top: 1240, width: 380, height: 500 }}>
              <Kid at={chaos.kidAt - c} />
            </div>
          </Parallax>
          <SpeechBubble at={chaos.kidAt - c + 6} tail={380} style={{ left: 160, top: 1080 }} fontSize={64}>
            {copy.kid}
          </SpeechBubble>
        </Sequence>
        {/* D · everything at once (three micro-cuts = camera punch-ins). */}
        <Sequence from={d} layout="none">
          <Parallax depth={0.9}>
            <Tendera {...SHOT} seed={11} poses={[{ at: -40, pose: "think" }]} />
          </Parallax>
          <Parallax depth={1.15}>
            <div style={{ position: "absolute", left: 120, top: 1330, transform: "rotate(-14deg)" }}>
              <RingingPhone frame={frame} ringAt={d} width={120} />
            </div>
            <Customer at={0} x={HAND.x} y={HAND.y - 60} sleeve={SLEEVES[1]} bill={formatUSD(rushCents[3])} />
            <Customer at={6} x={130} y={1250} flip sleeve={SLEEVES[3]} coin angle={-6} />
            <Customer at={14} x={HAND.x} y={HAND.y + 90} sleeve={SLEEVES[2]} bill={formatUSD(rushCents[4])} angle={-6} />
            <div style={{ position: "absolute", left: 500, top: 1330, width: 330, height: 440 }}>
              <Kid at={0} shirt="#5B8C3F" cap="#C94A3A" />
            </div>
            <PaperNote kind="sticky" lines={["Pan $0.75", "Fiado ¿?"]} x={60} y={1460} at={4} rotate={-10} from={{ x: -500, y: 300 }} width={250} fontSize={44} />
            <PaperNote kind="receipt" lines={["$2", "$1.50", "¿$5?"]} x={720} y={1420} at={16} rotate={8} from={{ x: 500, y: 300 }} width={200} fontSize={42} />
          </Parallax>
        </Sequence>
      </Shake>
      {/* HUD: the tally and the clock stay put across the cuts. */}
      <TallyBadge steps={chaos.tally} x={64} y={180} singular={copy.tallyOne} plural={copy.tallyMany} />
      <div style={{ position: "absolute", left: 690, top: 170 }}>
        <WallClock size={190} minute={minute} shake={frenzy * 3} frame={frame} />
      </div>
      {/* A quick flash on each cut. */}
      {chaos.shots.slice(1).map((at) => (
        <AbsoluteFill key={at} style={{ background: colors.paperLight, opacity: frame < at ? 0 : interpolate(frame, [at, at + 3], [0.55, 0], { extrapolateRight: "clamp" }), pointerEvents: "none" }} />
      ))}
    </Scene>
  );
};

// 3 · Night: notebook open, she can't place the $3. Then the deadpan look to camera. ────────────
export const NightScene: React.FC = () => {
  const frame = useCurrentFrame();
  const z = night.deadpanAt;
  // Snap zoom onto her face (≈ x 509, y 1020 on screen) and a slow creep while she stares.
  const snap = ease(frame, z, night.zoomFrames);
  const creep = interpolate(frame, [z + night.zoomFrames, scenes.night.duration], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const scale = 1 + snap * 0.62 + creep * 0.06;
  const fx = 509;
  const fy = 1020;
  const ty = snap * (960 - fy) + snap * 40;
  const tx = snap * (540 - fx);
  return (
    <Scene background={NIGHT} dark camera={[{ at: 0, scale: 1.04 }, { at: z, scale: 1.0 }]}>
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 56%, rgba(232,184,74,0.42), rgba(232,184,74,0) 48%)" }} />
      {/* Hanging bulb. */}
      <div style={{ position: "absolute", left: 536, top: -20, width: 6, height: 610, background: colors.ink, opacity: 0.8 }} />
      <AbsoluteFill style={{ transform: `translate(${tx}px, ${ty}px) scale(${scale})`, transformOrigin: `${fx}px ${fy}px` }}>
        <Parallax depth={0.9}>
          <Tendera
            left={-60}
            top={800}
            width={1100}
            seed={3}
            says={{ line: "remate", at: night.vo }}
            poses={[
              { at: 0, pose: "worry" },
              { at: 8, pose: "scratch" },
              { at: z - 4, pose: "deadpan" },
            ]}
          />
        </Parallax>
        <Parallax depth={1.1}>
          <div style={{ position: "absolute", left: 190, top: 1500, transform: "rotate(-3deg)" }}>
            <Notebook width={700} height={380} fontSize={40} left={notebook.left.map((l, i) => ({ ...l, strikeAt: l.strikeAt === undefined ? undefined : 20 + i }))} right={notebook.right} />
          </div>
        </Parallax>
      </AbsoluteFill>
      {/* Bulb glow over everything (it doesn't zoom: it's "in front"). */}
      <div style={{ position: "absolute", left: 500, top: 560, width: 80, height: 96, borderRadius: "40px 40px 46px 46px", background: colors.accent, boxShadow: `0 0 90px 40px rgba(232,184,74,${0.35 + Math.sin(frame / 7) * 0.04})`, opacity: 1 - snap }} />
      <Head lines={copy.punch} at={night.head} dark highlight={["$3"]} />
    </Scene>
  );
};

// 4 · Rewind: the whole day plays backwards to the first sale. ───────────────────────────────
const DayAt: React.FC<{ t: number }> = ({ t }) => {
  const S = scenes;
  const pick = t >= S.night.from ? { from: S.night.from, C: NightScene } : t >= S.chaos.from ? { from: S.chaos.from, C: ChaosScene } : { from: 0, C: HookScene };
  return (
    <Freeze frame={t - pick.from}>
      <pick.C />
    </Freeze>
  );
};
export const RewindScene: React.FC = () => <Rewind from={rewind.from} to={rewind.to} frames={scenes.rewind.duration} render={(t) => <DayAt t={t} />} />;

// 5 · Redo: same sale, same framing; this time two taps in the app before the customer leaves. ────
const PHONE = { left: 240, top: 425, width: 600, height: 1150, scale: 1.05 };
export const RedoScene: React.FC = () => {
  const frame = useCurrentFrame();
  const r = redo;
  const wide = frame < r.closeUp || frame >= r.wideAt;
  const poses: PoseKey[] = [
    { at: 0, pose: "idle" },
    { at: sale.takeAt, pose: "give" },
    { at: r.phoneAt, pose: "phone" },
    { at: r.wideAt - 2, pose: "relief" },
    { at: r.vo + 8, pose: "cheer" },
  ];
  const rise = ease(frame, r.closeUp, 10);
  return (
    <Scene
      background={colors.paper}
      camera={wide ? [{ at: 0, scale: 1.0 }, { at: r.closeUp, scale: 1.04 }, { at: r.wideAt, scale: 1.06, y: -10 }, { at: scenes.redo.duration, scale: 1.0 }] : [{ at: r.closeUp, scale: 1.04 }, { at: r.wideAt, scale: 1.0 }]}
      shapes={wide ? [{ kind: "blob", x: 880, y: 1480, size: 560, color: colors.accentSoft, depth: 0.3 }] : [{ kind: "blob", x: 860, y: 1300, size: 640, color: colors.primarySoft, depth: 0.25 }, { kind: "dots", x: 150, y: 1500, size: 170, color: colors.accent, depth: 0.4 }]}
    >
      {wide ? (
        <>
          <Parallax depth={0.9}>
            <Tendera {...SHOT} poses={poses} holding={heldBill(frame, sale.grabAt, r.phoneAt - 2)} says={{ line: "listo", at: r.vo }} />
          </Parallax>
          <Parallax depth={1.1}>
            <Customer at={sale.handIn} out={r.handOut} {...HAND} bill={frame < sale.grabAt ? money.lost : null} />
          </Parallax>
          <SpeechBubble at={r.vo + 2} tail={260} style={{ left: 170, top: 600 }}>
            {copy.done}
          </SpeechBubble>
        </>
      ) : (
        <>
          <Parallax depth={1}>
            <Phone
              width={PHONE.width}
              height={PHONE.height}
              style={{ left: PHONE.left, top: PHONE.top, transform: `translateY(${(1 - rise) * 220 + drift(frame, 110, 5)}px) rotate(${(1 - rise) * 5 + drift(frame + 30, 150, 0.5)}deg) scale(${PHONE.scale})`, transformOrigin: "50% 0%" }}
            >
              <Sequence from={r.closeUp} layout="none">
                <QuickSaleScreen catalog={catalog} pick={PICK} pickAt={r.pickAt - r.closeUp} chargeAt={r.chargeAt - r.closeUp} />
              </Sequence>
            </Phone>
          </Parallax>
          {/* The customer is still right there, waiting (bag in hand). */}
          <Parallax depth={1.2}>
            <Customer at={r.closeUp - 12} x={940} y={1500} angle={-10} length={420} />
          </Parallax>
          <TapCount n={1} at={r.pickAt} x={60} y={PHONE.top + 300} />
          <TapCount n={2} at={r.chargeAt} x={60} y={PHONE.top + 890} />
        </>
      )}
      <Head lines={copy.redo} at={2} highlight={["2", "segundos."]} nowrap />
    </Scene>
  );
};

/** Big "1" / "2" tap counters next to the phone. */
const TapCount: React.FC<{ n: number; at: number; x: number; y: number }> = ({ n, at, x, y }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < at) return null;
  const p = springIn(frame, at, fps, 16);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 120, height: 120, borderRadius: 60, background: colors.primary, border: `6px solid ${colors.ink}`, boxShadow: `6px 7px 0 ${colors.ink}`, display: "flex", alignItems: "center", justifyContent: "center", ...display, fontWeight: 600, fontSize: 80, color: colors.paperLight, transform: `scale(${p}) rotate(${(1 - p) * -20 + drift(frame, 40, 3)}deg)` }}>
      <span style={{ marginTop: -8 }}>{n}</span>
    </div>
  );
};

// 6 · End: logo + "tu libreta de ventas", tag CTA with a drawn hand pointing down. ──────────────
export const EndScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const at = end.at;
  const mark = springIn(frame, at, fps, 26);
  const hand = springIn(frame, at + 30, fps, 18);
  const badge = springIn(frame, at + 34, fps, 22);
  const soc = ease(frame, at + 40, 14);
  const bob = Math.abs(Math.sin((frame - at) / 5)) * 26;
  return (
    <Scene
      background={colors.ink}
      dark
      camera={[{ at: 0, scale: 1.05 }, { at: scenes.end.duration, scale: 1.0 }]}
      shapes={[
        { kind: "ring", x: 1010, y: 1540, size: 300, color: colors.primary, depth: 0.4 },
        { kind: "blob", x: 70, y: 1580, size: 440, color: colors.primaryDeep, depth: 0.25 },
        { kind: "star", x: 150, y: 260, size: 64, color: colors.accent, depth: 0.7, spin: 1.2 },
        { kind: "star", x: 930, y: 260, size: 64, color: colors.accent, depth: 0.7, spin: -1.2 },
      ]}
    >
      <Parallax depth={0.6}>
        <div style={{ position: "absolute", left: 0, width: 1080, top: 140, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <div style={{ transform: `scale(${0.6 + mark * 0.4})`, opacity: mark }}>
            <Wordmark width={380} light />
          </div>
          <div style={{ ...display, fontSize: 64, color: colors.paper, marginTop: 2 }}>
            <PopWords text={copy.tagline} start={at + 6} stagger={3} />
          </div>
          <div style={{ ...display, fontSize: 100, lineHeight: 1.04, color: colors.paper, marginTop: 200 }}>
            <Headline lines={copy.cta} start={at + 12} lineGap={2} highlight={["“ahorita", "lo", "apunto”"]} highlightColor={colors.accent} />
          </div>
          <div style={{ marginTop: 34 + bob, transform: `rotate(90deg) scale(${hand})`, opacity: Math.min(1, hand * 2) }}>
            <PointRight size={190} />
          </div>
          <div style={{ marginTop: 60 - bob, transform: `scale(${0.5 + badge * 0.5})`, opacity: Math.min(1, badge * 2) }}>
            <StoreBadge height={130} />
          </div>
          <div style={{ marginTop: 40, display: "flex", alignItems: "center", gap: 14, opacity: soc, transform: `translateY(${(1 - soc) * 16}px)` }}>
            <SocialIcon kind="tiktok" size={50} />
            <SocialIcon kind="instagram" size={50} />
            <span style={{ fontFamily: fonts.sans, fontWeight: 600, fontSize: 48, color: colors.paper, marginLeft: 6 }}>{copy.handle}</span>
          </div>
        </div>
      </Parallax>
    </Scene>
  );
};

