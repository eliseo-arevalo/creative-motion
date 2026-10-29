import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../../tokens";
import { formatUSD } from "../money";
import { ease, springIn } from "../motion";
import { Tap } from "../Tap";
import { AppBar, Button, Card, Label, SCREEN_W, SlideRow, TypeToggle } from "./ui";

export type Product = { name: string; priceCents: number; qty: number; swatch: string };

const TILE_W = (SCREEN_W - 64 - 20) / 2;
const TILE_H = 112;
const GRID_TOP = 206;
const tileCenter = (i: number) => ({
  x: 32 + (i % 2) * (TILE_W + 20) + TILE_W / 2,
  y: GRID_TOP + Math.floor(i / 2) * (TILE_H + 18) + TILE_H / 2,
});
const BUTTON_Y = 884;

/**
 * Sale screen: tap products → lines land on the ticket, total counts up,
 * then "Cobrar" is pressed. Beats are local frames supplied by the scene.
 */
export const TicketScreen: React.FC<{
  products: Product[];
  addAt: number[];
  chargeAt: number;
}> = ({ products, addAt, chargeAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const total = Math.round(
    products.reduce((sum, p, i) => sum + p.priceCents * p.qty * ease(frame, addAt[i] ?? 1e9, 10), 0),
  );
  const finalTotal = products.reduce((sum, p) => sum + p.priceCents * p.qty, 0);
  const paid = frame >= chargeAt + 6;
  const stamp = springIn(frame, chargeAt + 8, fps, 22);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <AppBar />
      <TypeToggle active="sale" />
      <Label style={{ position: "absolute", left: 32, top: 170 }}>Productos</Label>
      {products.map((p, i) => {
        const c = tileCenter(i);
        const hit = interpolate(frame - (addAt[i] ?? 1e9), [0, 4, 12], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const added = frame >= (addAt[i] ?? 1e9);
        return (
          <div
            key={p.name}
            style={{
              position: "absolute",
              left: c.x - TILE_W / 2,
              top: c.y - TILE_H / 2,
              width: TILE_W,
              height: TILE_H,
              borderRadius: 22,
              background: colors.surface,
              border: `3px solid ${added ? colors.primary : "transparent"}`,
              boxSizing: "border-box",
              padding: "14px 18px",
              display: "flex",
              gap: 14,
              alignItems: "center",
              transform: `scale(${1 - hit * 0.06})`,
            }}
          >
            <span style={{ width: 46, height: 46, borderRadius: 14, background: p.swatch, flexShrink: 0 }} />
            <div style={{ lineHeight: 1.15 }}>
              <div style={{ fontSize: 24, fontWeight: 600 }}>{p.name}</div>
              <div style={{ fontSize: 22, color: colors.inkSoft }}>{formatUSD(p.priceCents)}</div>
            </div>
          </div>
        );
      })}
      <Card style={{ position: "absolute", left: 28, right: 28, top: 476, padding: "18px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 26, fontWeight: 600 }}>Ticket</span>
          <span style={{ fontSize: 20, fontFamily: fonts.mono, color: colors.inkMuted }}>
            {products.filter((_, i) => frame >= (addAt[i] ?? 1e9)).length} ÍTEMS
          </span>
        </div>
        <div style={{ height: 2, background: colors.line, margin: "12px 0 4px" }} />
        <div style={{ minHeight: 4 * 54 }}>
          {products.map((p, i) => (
            <SlideRow key={p.name} at={addAt[i] ?? 1e9} height={54} style={{ fontSize: 24 }}>
              <span>
                <span style={{ color: colors.inkMuted, fontFamily: fonts.mono, fontSize: 21 }}>{p.qty}×</span> {p.name}
              </span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatUSD(p.priceCents * p.qty)}</span>
            </SlideRow>
          ))}
        </div>
        <div style={{ height: 2, background: colors.line, margin: "6px 0 10px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 26, color: colors.inkSoft }}>Total</span>
          <span style={{ fontSize: 46, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: colors.primary }}>{formatUSD(total)}</span>
        </div>
      </Card>
      <div style={{ position: "absolute", left: 32, right: 32, top: BUTTON_Y - 44 }}>
        <Button label={`Cobrar ${formatUSD(finalTotal)}`} doneLabel="Cobrado ✓" pressAt={chargeAt} />
      </div>
      {paid && (
        <div
          style={{
            position: "absolute",
            right: 40,
            top: 500,
            padding: "10px 18px",
            border: `4px solid ${colors.primary}`,
            color: colors.primary,
            borderRadius: 14,
            fontFamily: fonts.mono,
            fontSize: 26,
            fontWeight: 500,
            transform: `rotate(-10deg) scale(${0.6 + stamp * 0.4})`,
            background: colors.paperLight,
          }}
        >
          COBRADO
        </div>
      )}
      {addAt.map((at, i) => {
        const c = tileCenter(i);
        return <Tap key={i} x={c.x + 30} y={c.y + 10} at={at} />;
      })}
      <Tap x={SCREEN_W / 2 + 60} y={BUTTON_Y + 6} at={chargeAt} />
    </div>
  );
};
