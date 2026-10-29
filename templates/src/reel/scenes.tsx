import type { ReactNode } from "react";
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { Canvas } from "../components/Layout";
import { Backdrop, type BackdropShape } from "../kit/Backdrop";
import { Camera, Parallax, type CameraKey } from "../kit/Camera";
import { BrandEndCard } from "../kit/EndCard";
import { drift, ease, springIn } from "../kit/motion";
import { Notebook } from "../kit/Notebook";
import { PaperNote } from "../kit/PaperNote";
import { Phone } from "../kit/Phone";
import { ReachArm } from "../kit/ReachArm";
import { DayTotalScreen, FiadoScreen, OpenAppScreen, TicketScreen } from "../kit/screens";
import { Shake } from "../kit/Shake";
import { rightWristAt, Shopkeeper, type PoseKey } from "../kit/Shopkeeper";
import { Storefront } from "../kit/Shutter";
import { SpeechBubble } from "../kit/SpeechBubble";
import { Headline } from "../kit/Words";
import { colors, display, fonts } from "../tokens";
import { STORE_URL, clients, copy, daySalesCents, debts, marta, money, notebook, papers, rushCents, salesCount, ticket } from "./content";
import { formatUSD } from "../kit/money";
import { end, hook, narr, problem, relief, scenes, solution, vo } from "./timeline";

// Text safe zone: x 60–880 (≈200 px free on the right for the app's buttons), nothing key below y 1670.
const HEAD = { left: 64, width: 820, top: 170, size: 112 };

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

/** Price / change tag that pops (hook). */
const Tag: React.FC<{ at: number; x: number; y: number; children: ReactNode; color?: string; rotate?: number }> = ({ at, x, y, children, color = colors.accent, rotate = -6 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < at) return null;
  const p = springIn(frame, at, fps, 16);
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `scale(${p}) rotate(${rotate + drift(frame, 40, 2)}deg)`, padding: "14px 30px", borderRadius: 28, background: color, border: `5px solid ${colors.ink}`, boxShadow: `7px 8px 0 ${colors.ink}`, fontFamily: fonts.sans, fontWeight: 700, fontSize: 64, color: colors.ink, whiteSpace: "nowrap" }}>
      {children}
    </div>
  );
};

// Props held in the tendera's right hand (viewBox space; origin = wrist).
const Bag: React.FC<{ w: { x: number; y: number } }> = ({ w }) => (
  <g transform={`translate(${w.x + 6} ${w.y - 4})`}>
    <rect x="-18" y="-46" width="20" height="60" rx="8" fill={colors.primary} stroke={colors.ink} strokeWidth="4" />
    <rect x="6" y="-30" width="34" height="44" rx="6" fill={colors.accent} stroke={colors.ink} strokeWidth="4" />
    <path d="M-44 0H64L56 128H-36Z" fill="#C9935A" stroke={colors.ink} strokeWidth="5" strokeLinejoin="round" />
    <path d="M-40 18H60" stroke="#A8763F" strokeWidth="5" />
  </g>
);
const Coins: React.FC<{ w: { x: number; y: number } }> = ({ w }) => (
  <g transform={`translate(${w.x + 18} ${w.y - 12})`}>
    {[[-6, 0], [12, -8], [4, -20]].map(([x, y], i) => (
      <circle key={i} cx={x} cy={y} r="13" fill={colors.accent} stroke={colors.ink} strokeWidth="4" />
    ))}
  </g>
);

const Bill: React.FC<{ label: string }> = ({ label }) => (
  <div style={{ position: "absolute", left: -150, top: -80, width: 300, height: 150, borderRadius: 14, background: "#8FBF8A", border: `5px solid ${colors.ink}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: fonts.sans, fontWeight: 700, fontSize: 64, color: colors.primaryDeep }}>
    <div style={{ position: "absolute", inset: 12, border: `3px solid ${colors.primaryDeep}`, borderRadius: 8, opacity: 0.5 }} />
    {label}
  </div>
);

/** The tendera in a px box (viewBox 900×820). */
const Tendera: React.FC<{ left: number; top: number; width: number; poses: PoseKey[]; holding?: (w: { x: number; y: number; angle: number }) => ReactNode; seed?: number; sighAt?: number }> = ({ left, top, width, poses, holding, seed, sighAt }) => (
  <div style={{ position: "absolute", left, top, width, height: (width * 820) / 900 }}>
    <Shopkeeper poses={poses} holding={holding} seed={seed} sighAt={sighAt} />
  </div>
);

// 1 · Hook: a busy run of sales under the narration — serve, charge, change, fiado, rush. ──
const BELL_SLEEVES = ["#5B6FB0", "#8E5B9E", "#C9714A", "#3F8C8C"];
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const [s0, s1, s2, s3, s4] = hook.shots;
  const kicks = hook.shots.map((at) => ({ at, amount: 18 })).concat(
    [hook.billAt, hook.coinsAt, ...hook.rush].map((at) => ({ at, amount: 8 })),
  );
  return (
    <Scene background={colors.paper} camera={[{ at: 0, scale: 1.08 }, { at: 180, scale: 1.0 }]} shapes={[{ kind: "blob", x: 880, y: 1480, size: 560, color: colors.accentSoft, depth: 0.3 }]}>
      <Shake kicks={kicks} base={1.5 + ease(frame, s3, 50) * 2}>
        {/* A · "Vendés todo el día": hands over the bag. */}
        <Sequence from={s0} durationInFrames={s1 - s0} layout="none">
          <Parallax depth={0.9}>
            <Tendera left={-150} top={720} width={1100} poses={[{ at: 0, pose: "idle" }, { at: 0, pose: "give" }]} holding={(w) => <Bag w={w} />} />
          </Parallax>
          <Parallax depth={1.1}>
            <HandIn at={2} x={930} y={1250} />
          </Parallax>
          <Tag at={hook.scanAt} x={90} y={640}>{money.ticket}</Tag>
        </Sequence>
        {/* B · "cobrás, das vuelto": bill into the tin, change out. */}
        <Sequence from={s1} durationInFrames={s2 - s1} layout="none">
          <CashCloseUp billAt={hook.billAt - s1} coinsAt={hook.coinsAt - s1} />
        </Sequence>
        {/* C · "fiás": the bag goes to Doña Marta, a sticky note gets slapped on. */}
        <Sequence from={s2} durationInFrames={s3 - s2} layout="none">
          <Parallax depth={0.9}>
            <Tendera left={-150} top={720} width={1100} seed={4} poses={[{ at: 0, pose: "point" }, { at: 3, pose: "give" }]} holding={(w) => <Bag w={w} />} />
          </Parallax>
          <Parallax depth={1.1}>
            <HandIn at={2} x={930} y={1250} sleeve={BELL_SLEEVES[1]} />
          </Parallax>
          <Tag at={hook.fiadoAt - s2} x={90} y={640} color={colors.accentSoft}>Fiado: Doña Marta</Tag>
          <PaperNote kind="sticky" lines={papers.sticky} x={60} y={1380} at={hook.fiadoAt - s2 + 8} rotate={-9} from={{ x: -500, y: 200 }} width={280} fontSize={54} />
        </Sequence>
        {/* D · rush: one sale after another, money keeps coming in. */}
        <Sequence from={s3} durationInFrames={s4 - s3} layout="none">
          <CashRush drops={hook.rush.map((at, i) => ({ at: at - s3, cents: rushCents[i], side: i % 2 ? "left" : "right", sleeve: BELL_SLEEVES[(i + 2) % 4] }))} />
        </Sequence>
        {/* E · and the papelitos pile up. */}
        <Sequence from={s4} durationInFrames={180 - s4} layout="none">
          <Parallax depth={0.9}>
            <Tendera left={-150} top={720} width={1100} seed={8} poses={[{ at: 0, pose: "point" }, { at: 4, pose: "give" }]} holding={(w) => <Coins w={w} />} />
          </Parallax>
          <Parallax depth={1.1}>
            <HandIn at={4} x={930} y={1240} open sleeve={BELL_SLEEVES[3]} />
          </Parallax>
          <PaperNote kind="torn" lines={papers.torn} x={600} y={1480} at={hook.papersAt - s4} rotate={7} from={{ x: 500, y: 300 }} width={270} fontSize={50} />
          <PaperNote kind="receipt" lines={papers.receipt} x={60} y={1400} at={hook.papersAt - s4 + 6} rotate={-6} from={{ x: -500, y: 200 }} width={230} fontSize={48} />
          <PaperNote kind="sticky" lines={papers.phone} x={330} y={1560} at={hook.papersAt - s4 + 12} rotate={3} from={{ x: 0, y: 600 }} width={300} fontSize={48} />
        </Sequence>
      </Shake>
      <Head lines={copy.hook} at={narr.at} highlight={["día…"]} />
      {/* A quick flash on each cut. */}
      {hook.shots.slice(1).map((at) => (
        <AbsoluteFill key={at} style={{ background: colors.paperLight, opacity: frame < at ? 0 : interpolate(frame, [at, at + 3], [0.6, 0], { extrapolateRight: "clamp" }), pointerEvents: "none" }} />
      ))}
    </Scene>
  );
};

/** A customer's hand coming in from the right to take the bag / the change. */
const HandIn: React.FC<{ at: number; x: number; y: number; open?: boolean; sleeve?: string }> = ({ at, x, y, open, sleeve = BELL_SLEEVES[0] }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const r = springIn(frame, at, fps, 14);
  return (
    <div style={{ position: "absolute", left: x, top: y + (open ? 0 : drift(frame, 30, 4)) }}>
      <ReachArm reach={r} length={520} angle={open ? -8 : 4} sleeve={sleeve} />
    </div>
  );
};

/** Counter top + open cash tin (shared by the cash close-ups). */
const CashTin: React.FC<{ fill?: number }> = ({ fill = 0 }) => (
  <>
    <div style={{ position: "absolute", left: -60, right: -60, top: 800, bottom: -60, background: colors.accent, borderTop: `8px solid ${colors.ink}` }} />
    <div style={{ position: "absolute", left: -60, right: -60, top: 830, height: 14, background: colors.accentDeep, opacity: 0.5 }} />
    <div style={{ position: "absolute", left: 90, top: 1020, width: 760, height: 420, borderRadius: 26, background: colors.primaryDeep, border: `6px solid ${colors.ink}`, boxShadow: `10px 12px 0 rgba(30,42,36,0.3)`, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, padding: 22 }}>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} style={{ borderRadius: 14, background: colors.primary, border: `4px solid ${colors.ink}`, position: "relative", overflow: "hidden" }}>
          {i < 2 && [0, 1, 2].slice(0, 1 + Math.min(2, Math.floor(fill))).map((k) => <div key={k} style={{ position: "absolute", left: 8 + k * 4, right: 8 - k * 4, top: 30 + k * 18, height: 260, background: "#8FBF8A", border: `3px solid ${colors.ink}`, borderRadius: 6, transform: `rotate(${(k - 1) * 3}deg)` }} />)}
          {i >= 2 && [0, 1, 2, 3].slice(0, 3 + Math.min(1, Math.floor(fill / 2))).map((k) => <div key={k} style={{ position: "absolute", left: 18 + (k % 2) * 16, top: 230 - k * 40, width: 76, height: 76, borderRadius: 38, background: colors.accent, border: `4px solid ${colors.ink}` }} />)}
        </div>
      ))}
    </div>
  </>
);

const CashCloseUp: React.FC<{ billAt: number; coinsAt: number }> = ({ billAt, coinsAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const arm = springIn(frame, 0, fps, 10);
  const drop = ease(frame, billAt, 8);
  const giveArm = springIn(frame, coinsAt - 8, fps, 10);
  const coinFly = ease(frame, coinsAt, 10);
  return (
    <AbsoluteFill>
      <CashTin />
      <div style={{ position: "absolute", left: 900, top: 900 }}>
        <ReachArm reach={arm} length={600} angle={6} />
      </div>
      <div style={{ position: "absolute", left: frame < billAt ? 790 + (1 - arm) * 760 : interpolate(drop, [0, 1], [790, 300]), top: interpolate(drop, [0, 1], [900, 1180]), transform: `rotate(${interpolate(drop, [0, 1], [-8, 12])}deg) scale(${1 - drop * 0.15})` }}>
        <Bill label={money.paid} />
      </div>
      <div style={{ position: "absolute", left: 300, top: 700 }}>
        <ReachArm reach={giveArm} flip length={560} angle={-4} sleeve={colors.primary} skin="#E2A47C" />
      </div>
      {frame >= coinsAt - 8 &&
        [0, 1, 2].map((i) => (
          <div key={i} style={{ position: "absolute", left: interpolate(coinFly, [0, 1], [320 + i * 30, 830 + i * 30]) - 31, top: interpolate(coinFly, [0, 1], [660, 840]) - 31 - Math.sin(coinFly * Math.PI) * (120 + i * 30), width: 62, height: 62, borderRadius: 31, background: colors.accent, border: `5px solid ${colors.ink}` }} />
        ))}
      <Tag at={billAt} x={90} y={560} rotate={-4}>+{money.ticket}</Tag>
      <Tag at={coinsAt + 2} x={330} y={680} color={colors.surface} rotate={5}>
        Vuelto {money.change}
      </Tag>
    </AbsoluteFill>
  );
};

type Drop = { at: number; cents: number; side: "left" | "right"; sleeve: string };
/** Rush: hands from both sides drop bills/coins into the tin, each sale pops its "+$x". */
const CashRush: React.FC<{ drops: Drop[] }> = ({ drops }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const landed = drops.filter((d) => frame >= d.at + 6).length;
  return (
    <AbsoluteFill>
      <CashTin fill={landed} />
      {drops.map((d, i) => {
        const t = frame - d.at;
        if (t < -6 || t > 22) return null;
        const reach = springIn(frame, d.at - 6, fps, 8) * (1 - ease(frame, d.at + 10, 10));
        const fall = ease(frame, d.at, 8);
        const bill = d.cents >= 500;
        const left = d.side === "left";
        const hx = left ? 260 : 820;
        const hy = 780 + (i % 2) * 70;
        const tx = left ? 260 + i * 40 : 600 + i * 30;
        return (
          <div key={i}>
            <div style={{ position: "absolute", left: hx, top: hy }}>
              <ReachArm reach={reach} flip={left} length={560} angle={left ? -6 : 6} sleeve={d.sleeve} skin={i % 2 ? "#C98B62" : "#8E5A3C"} />
            </div>
            <div style={{ position: "absolute", left: interpolate(fall, [0, 1], [hx + (left ? 40 : -40), tx]), top: interpolate(fall, [0, 1], [hy, 1200]), transform: `rotate(${fall * (left ? 14 : -10)}deg) scale(${bill ? 0.8 : 1})`, opacity: t > 16 ? 0 : 1 }}>
              {bill ? <Bill label={formatUSD(d.cents).replace(".00", "")} /> : <div style={{ position: "absolute", left: -34, top: -34, width: 68, height: 68, borderRadius: 34, background: colors.accent, border: `5px solid ${colors.ink}` }} />}
            </div>
          </div>
        );
      })}
      {drops.map((d, i) => (
        <Tag key={i} at={d.at + 2} x={[90, 500, 110, 480][i % 4]} y={[490, 520, 640, 670][i % 4]} rotate={[-6, 5, -3, 7][i % 4]} color={i % 2 ? colors.surface : colors.accent}>
          +{formatUSD(d.cents)}
        </Tag>
      ))}
    </AbsoluteFill>
  );
};

// 2 · Problem: closing time, notebook + papelitos, "¿Cuánto vendí hoy? ¿Y quién me debe?" ────
const NIGHT = "#1A2160";
export const ProblemScene: React.FC = () => {
  const cut = problem.closeUpAt;
  return (
    <Scene
      background={NIGHT}
      dark
      camera={[{ at: 0, scale: 1.0 }, { at: cut, scale: 1.06, y: -10 }, { at: cut + 1, scale: 1.1 }, { at: problem.worryAt - 1, scale: 1.03 }, { at: problem.worryAt, scale: 1.0 }, { at: scenes.problem.duration, scale: 1.02 }]}
    >
      <Sequence durationInFrames={cut} layout="none">
        <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 52%, rgba(232,184,74,0.45), rgba(232,184,74,0) 46%)" }} />
        <Parallax depth={0.9}>
          <Tendera left={-60} top={800} width={1100} seed={3} poses={[{ at: 0, pose: "idle" }, { at: 6, pose: "think" }]} />
        </Parallax>
        <Parallax depth={1.15}>
          <PaperNote kind="receipt" lines={papers.receipt} x={720} y={1300} at={4} rotate={9} from={{ x: 400, y: -600 }} width={220} fontSize={48} strikeAt={30} />
          <PaperNote kind="sticky" lines={papers.sticky} x={40} y={1380} at={10} rotate={-10} from={{ x: -400, y: -500 }} width={260} fontSize={50} />
          <PaperNote kind="phone" lines={papers.phone} x={330} y={1470} at={18} rotate={-3} from={{ x: 0, y: 700 }} width={330} fontSize={48} />
        </Parallax>
        <SpeechBubble at={vo.q1} tail={150} style={{ left: 300, top: 600 }}>
          {copy.ask[0]}
        </SpeechBubble>
      </Sequence>
      <Sequence from={cut} durationInFrames={problem.worryAt - cut} layout="none">
        <Shake kicks={[{ at: 0, amount: 10 }]}>
          <NotebookCloseUp />
        </Shake>
        <SpeechBubble at={0} tail={600} style={{ left: 80, top: 600 }} fontSize={66}>
          {copy.ask[1]}
        </SpeechBubble>
      </Sequence>
      <Sequence from={problem.worryAt} layout="none">
        <WorryBeat />
      </Sequence>
      <Head lines={copy.problem} at={4} dark highlight={["registro?"]} />
    </Scene>
  );
};

/** A paper that drifts down slowly, swaying side to side (local frames). */
const FallingPaper: React.FC<{ kind: "sticky" | "torn" | "receipt"; lines: readonly string[]; x: number; from: number; to: number; at: number; frames: number; width: number; rotate: number }> = ({ kind, lines, x, from, to, at, frames, width, rotate }) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const t = Math.min(1, (frame - at) / frames);
  const y = from + (to - from) * t;
  const sway = Math.sin((frame - at) / 9) * 38 * (1 - t * 0.6);
  return (
    <div style={{ position: "absolute", inset: 0, transform: `translate(${sway}px, ${y}px) rotate(${Math.sin((frame - at) / 9 - 0.6) * 9}deg)`, transformOrigin: `${x + width / 2}px 0px` }}>
      <PaperNote kind={kind} lines={lines} x={x} y={0} at={-60} rotate={rotate} width={width} fontSize={44} />
    </div>
  );
};

/**
 * The weight before the switch: back on her, closer. Looks down at the counter with pressed lips,
 * then rests her chin on her hand looking off into nothing and sighs; papers keep drifting down.
 */
const WorryBeat: React.FC = () => {
  const frame = useCurrentFrame();
  const push = 1 + Math.min(1, frame / 90) * 0.05;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: NIGHT }} />
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 60%, rgba(232,184,74,0.32), rgba(232,184,74,0) 50%)" }} />
      <AbsoluteFill style={{ transform: `scale(${push})`, transformOrigin: "50% 45%" }}>
        <Tendera
          left={-300}
          top={510}
          width={1600}
          seed={3}
          sighAt={44}
          poses={[
            { at: 0, pose: "worry" },
            { at: 16, pose: "chin" },
          ]}
        />
        <PaperNote kind="sticky" lines={papers.sticky} x={40} y={1500} at={-60} rotate={-12} width={250} fontSize={46} />
      </AbsoluteFill>
      <FallingPaper kind="torn" lines={papers.torn} x={640} from={-420} to={1300} at={0} frames={150} width={230} rotate={10} />
      <FallingPaper kind="receipt" lines={papers.receipt} x={120} from={-520} to={1100} at={22} frames={150} width={200} rotate={-8} />
    </AbsoluteFill>
  );
};

const NotebookCloseUp: React.FC = () => {
  const lines = (ls: readonly { text: string; strikeAt?: number; blot?: boolean; color?: string }[], base: number) =>
    ls.map((l, i) => ({ ...l, strikeAt: l.strikeAt === undefined && !l.blot ? undefined : base + i * 5 }));
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: -60, right: -60, top: 760, bottom: -60, background: "#5A4532" }} />
      <div style={{ position: "absolute", left: 70, top: 820, transform: "rotate(-3deg)" }}>
        <Notebook width={940} height={600} fontSize={50} left={lines(notebook.left, 4)} right={lines(notebook.right, 10)} />
      </div>
      <PaperNote kind="torn" lines={papers.torn} x={640} y={1340} at={6} rotate={8} from={{ x: 500, y: 300 }} width={260} fontSize={48} />
      <PaperNote kind="receipt" lines={papers.receipt} x={40} y={1400} at={12} rotate={-7} from={{ x: -500, y: 300 }} width={220} fontSize={46} />
    </AbsoluteFill>
  );
};

// 3 · Solution: open the app, note the sale, fiado to Doña Marta, see the day. ─────────────
// Phone sits fully below the two-line headline (which ends ≈ y 345) with air in between: top 470, scale 0.96 → bottom ≈ 1507.
const PHONE = { left: 260, top: 470, width: 560, height: 1080, scale: 0.96 };
const SOL_HEAD = { size: 96, top: 150, nowrap: true };
export const SolutionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const rise = ease(frame, 0, 22);
  const { sale, fiado, total } = solution;
  const slide = (from: number) => (1 - ease(frame, from, 12)) * 100;
  return (
    <Scene
      background={colors.paper}
      camera={[{ at: 0, scale: 1.04 }, { at: scenes.solution.duration, scale: 1.0, y: -12 }]}
      shapes={[
        { kind: "blob", x: 860, y: 1300, size: 640, color: colors.primarySoft, depth: 0.25 },
        { kind: "dots", x: 150, y: 1500, size: 170, color: colors.accent, depth: 0.4 },
      ]}
    >
      <Parallax depth={1}>
        <Phone
          width={PHONE.width}
          height={PHONE.height}
          style={{ left: PHONE.left, top: PHONE.top, transform: `translateY(${(1 - rise) * 260 + drift(frame, 110, 6)}px) rotate(${(1 - rise) * 6 + drift(frame + 30, 150, 0.6)}deg) scale(${PHONE.scale})`, transformOrigin: "50% 0%" }}
        >
          <Sequence from={sale.from} durationInFrames={fiado.from - sale.from + 12} layout="none">
            <TicketScreen products={ticket} addAt={sale.addAt} chargeAt={sale.chargeAt} />
          </Sequence>
          <Sequence from={fiado.from} durationInFrames={total.from - fiado.from + 12} layout="none">
            <div style={{ position: "absolute", inset: 0, background: colors.paper, transform: `translateX(${slide(fiado.from)}%)` }}>
              <FiadoScreen clients={clients} selected={0} amountCents={marta.fiadoCents} switchAt={fiado.switchAt} amountAt={fiado.amountAt} pickAt={fiado.pickAt} confirmAt={fiado.confirmAt} />
            </div>
          </Sequence>
          <Sequence from={total.from} layout="none">
            <div style={{ position: "absolute", inset: 0, background: colors.paper, transform: `translateX(${slide(total.from)}%)` }}>
              <DayTotalScreen salesCents={daySalesCents} salesCount={salesCount} debts={debts} at={total.at} />
            </div>
          </Sequence>
          <OpenAppScreen at={2} doneAt={solution.splashDone} />
        </Phone>
      </Parallax>
      {frame < solution.debtCopyAt ? <Head lines={copy.sale} at={solution.sale.vo - 4} highlight={["segundos"]} {...SOL_HEAD} /> : frame < solution.totalCopyAt ? (
        <Sequence from={solution.debtCopyAt} layout="none">
          <Head lines={copy.debt} at={0} highlight={["debe"]} {...SOL_HEAD} />
        </Sequence>
      ) : (
        <Sequence from={solution.totalCopyAt} layout="none">
          <Head lines={copy.total} at={0} highlight={["vendiste"]} {...SOL_HEAD} />
        </Sequence>
      )}
    </Scene>
  );
};

// 4 · Relief: close the notebook, smile, pull the shutter down. ──────────────────────────
const DUSK = "#1F4A35";
export const ReliefScene: React.FC = () => {
  const frame = useCurrentFrame();
  const outside = frame >= relief.outsideAt;
  return (
    <Scene background={outside ? DUSK : colors.paper} dark={outside} camera={outside ? [{ at: relief.outsideAt, scale: 1.08, y: 20 }, { at: 150, scale: 1.0 }] : [{ at: 0, scale: 1.0 }, { at: relief.outsideAt, scale: 1.05 }]}>
      <Sequence durationInFrames={relief.outsideAt} layout="none">
        <Parallax depth={0.9}>
          <Tendera left={-60} top={820} width={1100} seed={5} poses={[{ at: 0, pose: "idle" }, { at: relief.closeAt + 12, pose: "relief" }]} />
        </Parallax>
        <Parallax depth={1.1}>
          <div style={{ position: "absolute", left: 160, top: 1330, transform: "rotate(-2deg)" }}>
            <Notebook width={760} height={420} fontSize={40} left={notebook.left.slice(0, 4).map((l) => ({ text: l.text }))} right={[]} closeAt={relief.closeAt} />
          </div>
        </Parallax>
      </Sequence>
      <Sequence from={relief.outsideAt} layout="none">
        <ClosingUp />
      </Sequence>
      <Head lines={copy.relief} at={relief.vo - 2} lineGap={32} dark={outside} highlight={["claro."]} />
    </Scene>
  );
};

const ClosingUp: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const poses: PoseKey[] = [
    { at: 0, pose: "relief" },
    { at: relief.shutterAt, pose: "reach" },
    { at: relief.letGo - 16, pose: "idle" },
  ];
  // Inner shopkeeper box inside the opening: x 150, y 462, width 700 (scale 700/900).
  const S = 700 / 900;
  const IN_Y = 462;
  const w = rightWristAt(frame, poses, fps, 9);
  const handP = (IN_Y + w.y * S - 380) / 720;
  const START = 0.16;
  const gripAt = relief.shutterAt + 10;
  let shutter = START;
  if (frame >= gripAt && frame < relief.letGo) shutter = Math.max(START, handP);
  if (frame >= relief.letGo) {
    const from = Math.max(START, (IN_Y + rightWristAt(relief.letGo, poses, fps, 9).y * S - 380) / 720);
    const t = ease(frame, relief.letGo, relief.landAt - relief.letGo);
    const bounce = interpolate(frame - relief.landAt, [0, 4, 9], [0, -0.025, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    shutter = from + (1 - from) * t + bounce;
  }
  const glow = interpolate(frame, [relief.landAt, relief.landAt + 30], [1, 0.3], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      {/* Moon + street. */}
      <div style={{ position: "absolute", left: 820, top: 110, width: 120, height: 120, borderRadius: 60, background: colors.paperLight, opacity: 0.9 }} />
      <div style={{ position: "absolute", left: -60, right: -60, top: 1640, bottom: -60, background: "#12301F" }} />
      <Parallax depth={0.95}>
        <div style={{ position: "absolute", left: 40, top: 560, width: 1000, height: 1100 }}>
          <Storefront
            shutter={shutter}
            glow={glow}
            sign={copy.sign}
            frame={frame}
            inside={
              <svg x={150} y={IN_Y} width={700} height={638} viewBox="0 0 900 820" overflow="visible">
                <Shopkeeper poses={poses} seed={9} />
              </svg>
            }
          />
        </div>
      </Parallax>
    </AbsoluteFill>
  );
};

// 5 · Close: logo + tagline + CTA. ───────────────────────────────────────────────────────
export const EndScene: React.FC = () => {
  return (
    <Scene
      background={colors.ink}
      dark
      camera={[{ at: 0, scale: 1.05 }, { at: 90, scale: 1.0 }]}
      shapes={[
        // Decorations kept to the corners, mirrored, so the centred column reads centred.
        { kind: "ring", x: 1010, y: 1520, size: 300, color: colors.primary, depth: 0.4 },
        { kind: "blob", x: 70, y: 1560, size: 440, color: colors.primaryDeep, depth: 0.25 },
        { kind: "star", x: 150, y: 250, size: 64, color: colors.accent, depth: 0.7, spin: 1.2 },
        { kind: "star", x: 930, y: 250, size: 64, color: colors.accent, depth: 0.7, spin: -1.2 },
      ]}
    >
      <Parallax depth={0.6}>
        <BrandEndCard
          tagline={copy.tagline}
          at={end.at}
          top={130}
          qr={{ url: STORE_URL, size: 460, label: copy.scan }}
          store={{ height: 160 }}
          socials={{ kinds: ["tiktok", "instagram"], handle: copy.handle }}
        />
      </Parallax>
      <Parallax depth={0.9}>
        <div style={{ position: "absolute", left: 370, top: 1330, width: 340, height: 310 }}>
          <Shopkeeper enterAt={36} poses={[{ at: 0, pose: "idle" }, { at: 50, pose: "wave" }]} />
        </div>
      </Parallax>
    </Scene>
  );
};
