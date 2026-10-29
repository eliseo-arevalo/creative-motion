import type { ReactNode } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Avatar, CoinIcon, ReceiptIcon, Spark } from "../components/Artwork";
import { Wordmark } from "../components/Layout";
import { Parallax } from "../kit/Camera";
import { drift, ease, springIn } from "../kit/motion";
import { Phone } from "../kit/Phone";
import { Shopkeeper } from "../kit/Shopkeeper";
import { PopWords } from "../kit/Words";
import {
  AbonoScreen,
  app,
  FiadoScreen,
  GastoScreen,
  HomeScreen,
  ProveedoresScreen,
  ResumenScreen,
  TicketScreen,
} from "../kit/screens";
import { brand, colors, display, fonts } from "../tokens";
import { ana, anaMovements, clients, copy, EXAMPLE_TAG, gasto, suppliers, summary, ticket, ticketTotalCents } from "./content";
import { PHONE, Shell } from "./Shell";
import { beats, vo, type PromoScene } from "./timeline";
import { formatUSD } from "../kit/money";

type SceneProps = { scene: PromoScene };

const baseCamera = (d: number) => [
  { at: 0, scale: 1.06, y: 26 },
  { at: 28, scale: 1, y: 0 },
  { at: d, scale: 1.03, y: -16 },
];

/** Phone in the right column; settles in, then floats gently (never a frozen hold). */
const PhoneSlot: React.FC<{ children: ReactNode; enterFrom?: number; tilt?: number; scale?: number }> = ({ children, enterFrom = 40, tilt = 0, scale = 1 }) => {
  const frame = useCurrentFrame();
  const settle = ease(frame, 0, 26);
  const y = (1 - settle) * enterFrom + drift(frame, 100, 6);
  return (
    <Parallax depth={1}>
      <Phone width={PHONE.width} height={PHONE.height} style={{ left: PHONE.left, top: PHONE.top, transform: `translateY(${y}px) rotate(${tilt + drift(frame + 30, 140, 0.6)}deg) scale(${scale})`, transformOrigin: "50% 100%" }}>
        {children}
      </Phone>
    </Parallax>
  );
};

/** Foreground layer for the lower-left third (moves a bit more than the phone). */
const Front: React.FC<{ children: ReactNode }> = ({ children }) => <Parallax depth={1.15}>{children}</Parallax>;

const Pop: React.FC<{ at: number; x: number; y: number; rotate?: number; children: ReactNode; w?: number }> = ({ at, x, y, rotate = -4, children, w }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < at) return null;
  const p = springIn(frame, at, fps, 26);
  return (
    <div style={{ position: "absolute", left: x, top: y + drift(frame + x, 90, 5), width: w, transform: `translateY(${(1 - p) * 90}px) rotate(${rotate + (1 - p) * 14}deg) scale(${0.4 + p * 0.6})`, transformOrigin: "50% 100%" }}>
      {children}
    </div>
  );
};

const stickerBox = (bg: string, extra: React.CSSProperties = {}): React.CSSProperties => ({
  background: bg,
  border: `3px solid ${colors.ink}`,
  borderRadius: 26,
  boxShadow: `7px 8px 0 ${colors.ink}`,
  padding: "22px 26px",
  ...extra,
});

// 1 · Hook ───────────────────────────────────────────────────────────────
export const HookPromo: React.FC<SceneProps> = ({ scene }) => {
  const frame = useCurrentFrame();
  const p = vo(scene);
  const notes = [
    { x: 70, y: 700, r: -10, at: p.at + 4, label: "$55?" },
    { x: 690, y: 650, r: 8, at: p.at + 14, label: "Gasto…" },
    { x: 730, y: 930, r: -6, at: p.at + 24, label: "¿Venta?" },
  ];
  const clockHand = frame * 9;
  return (
    <Shell
      background={colors.paper}
      camera={[{ at: 0, scale: 1.04 }, { at: scene.duration, scale: 1.0, y: -20 }]}
      shapes={[
        { kind: "blob", x: 900, y: 1500, size: 520, color: colors.primarySoft, depth: 0.25 },
        { kind: "dots", x: 160, y: 620, size: 160, color: colors.accent, depth: 0.4 },
        { kind: "star", x: 960, y: 600, size: 70, color: colors.accent, depth: 0.7, spin: 1.2 },
      ]}
      lines={copy.hook.lines}
      highlight={copy.hook.highlight}
      headAt={4}
    >
      <Parallax depth={0.9}>
        <div style={{ position: "absolute", left: 40, top: 930, width: 1000, height: 911 }}>
          <Shopkeeper enterAt={2} poses={[{ at: 0, pose: "idle" }, { at: 26, pose: "wave" }, { at: p.end - 6, pose: "point" }]} />
        </div>
      </Parallax>
      <Front>
        {notes.map((n) => (
          <Pop key={n.label} at={n.at} x={n.x} y={n.y} rotate={n.r}>
            <div style={{ ...stickerBox(colors.paperLight, { padding: "18px 30px", borderRadius: 18 }), fontSize: 64, fontWeight: 600, fontFamily: fonts.display, color: colors.ink, whiteSpace: "nowrap" }}>{n.label}</div>
          </Pop>
        ))}
        <Pop at={p.at + 30} x={110} y={960} rotate={6}>
          <svg width="150" height="150" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill={colors.accent} stroke={colors.ink} strokeWidth="5" />
            <path d={`M50 50L50 22`} stroke={colors.ink} strokeWidth="6" strokeLinecap="round" transform={`rotate(${clockHand} 50 50)`} />
            <path d="M50 50L68 50" stroke={colors.ink} strokeWidth="6" strokeLinecap="round" transform={`rotate(${clockHand / 12} 50 50)`} />
          </svg>
        </Pop>
      </Front>
    </Shell>
  );
};

// 2 · Problem ────────────────────────────────────────────────────────────
export const ProblemPromo: React.FC<SceneProps> = ({ scene }) => {
  const frame = useCurrentFrame();
  const p = vo(scene);
  const strikeAt = p.at + Math.round(p.frames * 0.7);
  const sweep = ease(frame, p.end + 4, 22);
  const phoneUp = ease(frame, p.end - 4, 26);
  return (
    <Shell
      background={colors.primary}
      dark
      camera={baseCamera(scene.duration)}
      shapes={[
        { kind: "ring", x: 880, y: 700, size: 360, color: colors.primaryDeep, depth: 0.3 },
        { kind: "blob", x: 140, y: 1640, size: 420, color: colors.primaryDeep, depth: 0.2 },
        { kind: "star", x: 120, y: 560, size: 64, color: colors.accent, depth: 0.7, spin: -1 },
      ]}
      lines={copy.problem.lines}
      highlight={copy.problem.highlight}
    >
      <Front>
        {copy.problem.notes.map((label, i) => {
          const strike = ease(frame, strikeAt + i * 4, 10);
          const x = [70, 250, 80][i];
          const y = [620, 850, 1080][i];
          return (
            <div key={label} style={{ position: "absolute", left: 0, top: 0, transform: `translate(${sweep * (760 - x)}px, ${sweep * (1500 - y)}px) scale(${1 - sweep * 0.8})`, transformOrigin: `${x}px ${y}px` }}>
              <Pop at={p.at + 2 + i * 9} x={x} y={y} rotate={[-7, 5, -3][i]}>
                <div style={{ ...stickerBox([colors.accentSoft, colors.paperLight, colors.accentSoft][i]), fontSize: 64, fontWeight: 600, fontFamily: fonts.display, color: colors.ink, position: "relative", whiteSpace: "nowrap", padding: "20px 30px" }}>
                  {label}
                  <div style={{ position: "absolute", left: 18, top: "52%", height: 9, borderRadius: 5, background: app.neu, width: `calc(${strike * 100}% - 36px)` }} />
                </div>
              </Pop>
            </div>
          );
        })}
      </Front>
      {/* The answer rises in the lower third and becomes the next scene. */}
      <Parallax depth={1}>
        <div style={{ position: "absolute", left: 470, top: 1920 - phoneUp * 520, width: 540, height: 1040, borderRadius: 78, background: colors.ink, padding: 18, boxSizing: "border-box" }}>
          <div style={{ width: "100%", height: "100%", borderRadius: 62, background: colors.paper, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 120, boxSizing: "border-box" }}>
            <Wordmark width={300} />
          </div>
        </div>
      </Parallax>
    </Shell>
  );
};

// 3 · Sale ───────────────────────────────────────────────────────────────
export const SalePromo: React.FC<SceneProps> = ({ scene }) => {
  const frame = useCurrentFrame();
  const b = beats.sale(scene);
  const total = Math.round(ticket.reduce((sum, item, i) => sum + item.priceCents * item.qty * ease(frame, b.addAt[i], 10), 0));
  const paid = frame >= b.chargeAt + 6;
  return (
    <Shell
      background={colors.paper}
      camera={[...baseCamera(b.chargeAt), { at: b.chargeAt + 16, scale: 1.05, y: -40, x: -20 }, { at: scene.duration, scale: 1.06, y: -50, x: -24 }]}
      shapes={[
        { kind: "blob", x: 760, y: 1240, size: 760, color: colors.primarySoft, depth: 0.3 },
        { kind: "dots", x: 150, y: 680, size: 150, color: colors.primary, depth: 0.45 },
      ]}
      lines={copy.sale.lines}
      highlight={copy.sale.highlight}
    >
      <PhoneSlot>
        <TicketScreen products={ticket} addAt={b.addAt} chargeAt={b.chargeAt} />
      </PhoneSlot>
      <Front>
        <Pop at={b.addAt[0] + 2} x={70} y={1150} rotate={-5} w={360}>
          <div style={stickerBox(paid ? colors.primarySoft : colors.paperLight)}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <ReceiptIcon size={60} />
              <span style={{ fontSize: 36, fontWeight: 600 }}>{paid ? "Cobrado ✓" : `${ticket.filter((_, i) => frame >= b.addAt[i]).length} productos`}</span>
            </div>
            <div style={{ fontSize: 72, fontWeight: 700, color: colors.primary, fontVariantNumeric: "tabular-nums", marginTop: 6 }}>{formatUSD(total)}</div>
          </div>
        </Pop>
        <Pop at={b.chargeAt + 8} x={300} y={1080} rotate={10}>
          <Spark size={90} />
        </Pop>
      </Front>
    </Shell>
  );
};

// 4 · Fiado ──────────────────────────────────────────────────────────────
export const FiadoPromo: React.FC<SceneProps> = ({ scene }) => {
  const frame = useCurrentFrame();
  const b = beats.fiado(scene);
  const p = vo(scene);
  const done = frame >= b.confirmAt + 6;
  return (
    <Shell
      background={colors.accentSoft}
      camera={baseCamera(scene.duration)}
      shapes={[
        { kind: "blob", x: 300, y: 1420, size: 560, color: colors.accent, depth: 0.25 },
        { kind: "ring", x: 930, y: 620, size: 220, color: colors.accentDeep, depth: 0.5 },
      ]}
      lines={copy.fiado.lines}
      highlight={copy.fiado.highlight}
    >
      <PhoneSlot>
        <FiadoScreen clients={clients} selected={0} amountCents={ana.fiadoCents} switchAt={b.switchAt} amountAt={b.amountAt} pickAt={b.pickAt} confirmAt={b.confirmAt} />
      </PhoneSlot>
      <Front>
        <Pop at={p.at} x={90} y={1290} rotate={0}>
          <div style={{ width: 230, height: 230, borderRadius: "50%", border: `4px solid ${colors.ink}`, overflow: "hidden", boxShadow: `7px 8px 0 ${colors.ink}`, background: colors.primarySoft }}>
            <Avatar size={222} variant={1} />
          </div>
          <div style={{ marginTop: 12, textAlign: "center", fontSize: 40, fontWeight: 600 }}>{ana.name}</div>
        </Pop>
        <Pop at={p.at + 6} x={60} y={1060} rotate={-4}>
          <div style={{ ...stickerBox(done ? colors.primarySoft : colors.paperLight, { borderRadius: "30px 30px 30px 6px" }), fontSize: 38, fontFamily: fonts.display }}>
            {done ? `Anotado: ${formatUSD(ana.fiadoCents)}` : copy.fiado.bubble}
          </div>
        </Pop>
      </Front>
    </Shell>
  );
};

// 5 · Abono ──────────────────────────────────────────────────────────────
export const AbonoPromo: React.FC<SceneProps> = ({ scene }) => {
  const frame = useCurrentFrame();
  const b = beats.abono(scene);
  const p = vo(scene);
  const coin = ease(frame, b.pressAt - 14, 16);
  return (
    <Shell
      background={colors.paper}
      camera={baseCamera(scene.duration)}
      shapes={[
        { kind: "blob", x: 860, y: 1100, size: 700, color: colors.primarySoft, depth: 0.3 },
        { kind: "star", x: 140, y: 560, size: 60, color: colors.accent, depth: 0.7, spin: 1 },
      ]}
      lines={copy.abono.lines}
      highlight={copy.abono.highlight}
      support={copy.abono.support}
      supportAt={p.at + 36}
    >
      <Parallax depth={0.9}>
        <div style={{ position: "absolute", left: -90, top: 1150, width: 720, height: 656 }}>
          <Shopkeeper seed={30} withCounter poses={[{ at: 0, pose: "point" }, { at: b.pressAt - 34, pose: "phone" }, { at: b.pressAt + 12, pose: "cheer" }, { at: b.pressAt + 48, pose: "idle" }]} />
        </div>
      </Parallax>
      <PhoneSlot>
        <AbonoScreen client={ana.name} tag={EXAMPLE_TAG} movements={anaMovements} rowAt={[-30, b.pressAt + 8]} pressAt={b.pressAt} />
      </PhoneSlot>
      <Front>
        {frame >= b.pressAt - 14 && frame < b.pressAt + 4 && (
          <div style={{ position: "absolute", left: 330 + coin * 330, top: 1330 - Math.sin(coin * Math.PI) * 260 + coin * 160, transform: `rotate(${coin * 360}deg)` }}>
            <div style={{ background: colors.accent, borderRadius: "50%", border: `3px solid ${colors.ink}`, padding: 12 }}>
              <CoinIcon size={70} />
            </div>
          </div>
        )}
        <Pop at={b.pressAt + 10} x={60} y={1040} rotate={-6}>
          <div style={{ ...stickerBox(colors.accent), fontSize: 34, fontWeight: 600 }}>
            Abono <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatUSD(ana.abonoCents)}</span>
          </div>
        </Pop>
      </Front>
    </Shell>
  );
};

// 6 · Gasto ──────────────────────────────────────────────────────────────
export const GastoPromo: React.FC<SceneProps> = ({ scene }) => {
  const b = beats.gasto(scene);
  const p = vo(scene);
  return (
    <Shell
      background={colors.paper}
      camera={baseCamera(scene.duration)}
      shapes={[
        { kind: "blob", x: 780, y: 1180, size: 760, color: app.neuSoft, depth: 0.3 },
        { kind: "dots", x: 950, y: 560, size: 130, color: app.neu, depth: 0.5 },
      ]}
      lines={copy.gasto.lines}
      highlight={copy.gasto.highlight}
      support={copy.gasto.support}
      supportAt={p.at + 34}
    >
      <PhoneSlot>
        <GastoScreen
          amountCents={gasto.amountCents}
          concept={gasto.concept}
          dateLabel={gasto.dateLabel}
          provider={gasto.supplier}
          from="debt"
          switchAt={b.switchAt}
          amountAt={b.amountAt}
          conceptAt={b.conceptAt}
          dateAt={b.dateAt}
          providerAt={b.providerAt}
          saveAt={b.saveAt}
        />
      </PhoneSlot>
      <Front>
        <Pop at={b.conceptAt} x={80} y={1290} rotate={-3}>
          {/* Mercadería crate. */}
          <svg width="300" height="230" viewBox="0 0 300 230">
            <rect x="20" y="70" width="260" height="150" rx="10" fill={colors.accent} stroke={colors.ink} strokeWidth="6" />
            <path d="M20 120H280M150 70V220" stroke={colors.accentDeep} strokeWidth="5" />
            <circle cx="80" cy="58" r="34" fill={app.neu} stroke={colors.ink} strokeWidth="5" />
            <rect x="130" y="16" width="56" height="64" rx="8" fill={colors.primarySoft} stroke={colors.ink} strokeWidth="5" />
            <ellipse cx="228" cy="56" rx="34" ry="24" fill={colors.paperLight} stroke={colors.ink} strokeWidth="5" />
          </svg>
        </Pop>
        <Pop at={b.dateAt + 2} x={70} y={1080} rotate={-8}>
          <div style={{ ...stickerBox(colors.paperLight, { padding: 0, overflow: "hidden", width: 170, textAlign: "center" }) }}>
            <div style={{ background: app.neu, height: 34, display: "flex", justifyContent: "center", alignItems: "center", gap: 56 }}>
              <span style={{ width: 12, height: 12, borderRadius: 6, background: colors.paper }} />
              <span style={{ width: 12, height: 12, borderRadius: 6, background: colors.paper }} />
            </div>
            <div style={{ fontSize: 54, fontWeight: 600, fontFamily: fonts.display, padding: "10px 0 14px" }}>{gasto.dateLabel}</div>
          </div>
        </Pop>
        <Pop at={b.providerAt + 2} x={60} y={1545} rotate={-4}>
          <div style={{ ...stickerBox(colors.ink, { padding: "14px 22px", borderRadius: 18 }), color: colors.paper, fontSize: 32, fontWeight: 600, whiteSpace: "nowrap" }}>{gasto.supplier}</div>
        </Pop>
      </Front>
    </Shell>
  );
};

// 7 · Proveedores ────────────────────────────────────────────────────────
export const ProveedoresPromo: React.FC<SceneProps> = ({ scene }) => {
  const frame = useCurrentFrame();
  const b = beats.proveedores(scene);
  const p = vo(scene);
  const ranked = suppliers.map((s) => s.purchases.reduce((a, c) => a + c, 0)).sort((a, c) => c - a);
  return (
    <Shell
      background={colors.primarySoft}
      camera={baseCamera(scene.duration)}
      shapes={[
        { kind: "blob", x: 260, y: 1460, size: 560, color: colors.paper, depth: 0.25 },
        { kind: "ring", x: 950, y: 640, size: 260, color: colors.primary, depth: 0.5 },
      ]}
      lines={copy.proveedores.lines}
      highlight={copy.proveedores.highlight}
      support={copy.proveedores.support}
      supportAt={p.at + Math.round(p.frames * 0.5)}
    >
      <PhoneSlot>
        <ProveedoresScreen suppliers={suppliers} period={copy.proveedores.period} barsAt={b.barsAt} highlightAt={b.highlightAt} freshName={gasto.supplier} />
      </PhoneSlot>
      <Front>
        <Pop at={b.barsAt} x={80} y={1180} rotate={-4}>
          <div style={{ ...stickerBox(colors.paperLight), width: 300, height: 300, boxSizing: "border-box", display: "flex", alignItems: "flex-end", gap: 22, padding: "30px 34px" }}>
            {ranked.map((v, i) => (
              <div key={i} style={{ flex: 1, height: `${(v / ranked[0]) * 100 * ease(frame, b.barsAt + 6 + i * 6, 24)}%`, background: i === 0 ? colors.primary : colors.accent, borderRadius: "12px 12px 4px 4px", border: `3px solid ${colors.ink}` }} />
            ))}
          </div>
        </Pop>
        <Pop at={b.highlightAt + 4} x={250} y={1110} rotate={12}>
          <Spark size={100} color={colors.primary} />
        </Pop>
      </Front>
    </Shell>
  );
};

// 8 · Resumen ────────────────────────────────────────────────────────────
export const ResumenPromo: React.FC<SceneProps> = ({ scene }) => {
  const frame = useCurrentFrame();
  const b = beats.resumen(scene);
  const fly = ease(frame, b.sheetAt - 10, 18);
  const chipColors = [colors.primary, colors.accentDeep, app.neu];
  return (
    <Shell
      background={colors.paper}
      camera={[...baseCamera(b.sheetAt), { at: b.sheetAt + 20, scale: 1.04, y: -30 }, { at: scene.duration, scale: 1.06, y: -40 }]}
      shapes={[
        { kind: "blob", x: 760, y: 1200, size: 760, color: colors.accentSoft, depth: 0.3 },
        { kind: "star", x: 140, y: 1720, size: 70, color: colors.primary, depth: 0.7, spin: 1 },
      ]}
      lines={copy.resumen.lines}
      highlight={copy.resumen.highlight}
    >
      <PhoneSlot>
        <HomeScreen
          rows={[
            { label: "Venta", detail: `${ticket.length} productos`, cents: ticketTotalCents, kind: "sale" },
            { label: "Fiado", detail: ana.name, cents: ana.fiadoCents, kind: "debt" },
            { label: "Abono", detail: ana.name, cents: ana.abonoCents, kind: "abono" },
            { label: "Gasto", detail: `${gasto.concept} · ${gasto.dateLabel}`, cents: gasto.amountCents, kind: "expense" },
          ]}
        />
        {frame >= b.sheetAt - 8 && <ResumenScreen salesCents={summary.salesCents} expensesCents={summary.expensesCents} pendingCents={summary.pendingCents} at={b.sheetAt} title={copy.resumen.sheetTitle} />}
      </PhoneSlot>
      <Front>
        {copy.resumen.chips.map((label, i) => {
          const x = 80;
          const y = 700 + i * 120;
          return (
            <div key={label} style={{ position: "absolute", left: 0, top: 0, transform: `translate(${fly * (600 - x)}px, ${fly * (1100 - y)}px) scale(${1 - fly * 0.7})`, transformOrigin: `${x}px ${y}px`, opacity: fly > 0.95 ? 0 : 1 }}>
              <Pop at={b.chipsAt + 4 + i * 10} x={x} y={y} rotate={[-4, 3, -2][i]}>
                <div style={{ ...stickerBox(chipColors[i], { padding: "16px 30px", borderRadius: 40 }), color: colors.paper, fontSize: 40, fontWeight: 600 }}>{label}</div>
              </Pop>
            </div>
          );
        })}
        <Pop at={b.paradoAt} x={60} y={1190} rotate={-3} w={410}>
          <div style={{ ...stickerBox(colors.ink), color: colors.paper, fontSize: 40, lineHeight: 1.15, fontFamily: fonts.display }}>
            {copy.resumen.support}
            <div style={{ marginTop: 14, fontSize: 38, fontWeight: 700, fontFamily: fonts.sans, color: colors.accent }}>
              Te quedó {formatUSD(summary.netCents)}
            </div>
          </div>
        </Pop>
      </Front>
    </Shell>
  );
};

// 9 · End card ───────────────────────────────────────────────────────────
export const EndPromo: React.FC<SceneProps> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = vo(scene);
  const mark = springIn(frame, p.at - 6, fps, 30);
  const underline = ease(frame, p.end + 4, 18);
  return (
    <Shell
      background={colors.ink}
      dark
      camera={[{ at: 0, scale: 1.05 }, { at: 30, scale: 1 }, { at: scene.duration, scale: 1.035, y: -10 }]}
      shapes={[
        { kind: "ring", x: 900, y: 520, size: 300, color: colors.primary, depth: 0.4 },
        { kind: "star", x: 160, y: 1000, size: 70, color: colors.accent, depth: 0.7, spin: 1.4 },
        { kind: "dots", x: 900, y: 1150, size: 150, color: colors.primaryDeep, depth: 0.3 },
      ]}
      lines={[]}
    >
      <Parallax depth={0.7}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 420, display: "flex", justifyContent: "center", transform: `scale(${0.6 + mark * 0.4}) rotate(${(1 - mark) * -6}deg)` }}>
          <Wordmark width={560} light />
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 720, textAlign: "center", ...display, fontSize: 110, color: colors.paper }}>
          <PopWords text={copy.end.lines[0]} start={p.at} stagger={4} highlight={brand.name.split(" ")} highlightColor={colors.accent} />
          <div style={{ height: 8, width: 420 * underline, background: colors.accent, borderRadius: 4, margin: "10px auto 0" }} />
        </div>
        <div style={{ position: "absolute", left: 80, right: 80, top: 900, textAlign: "center", fontSize: 42, color: colors.primarySoft }}>
          <PopWords text={copy.end.support} start={p.end + 6} stagger={2} />
        </div>
      </Parallax>
      <Parallax depth={1}>
        <div style={{ position: "absolute", left: 140, top: 1080, width: 800, height: 729 }}>
          <Shopkeeper seed={60} enterAt={2} poses={[{ at: 0, pose: "idle" }, { at: p.at + 16, pose: "wave" }, { at: p.end + 44, pose: "cheer" }]} />
        </div>
      </Parallax>
    </Shell>
  );
};
