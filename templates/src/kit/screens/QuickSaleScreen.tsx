import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../../tokens";
import { formatUSD } from "../money";
import { ease, springIn } from "../motion";
import { Tap } from "../Tap";
import { AppBar, Button, Card, Label, SCREEN_W, SlideRow, TypeToggle } from "./ui";
import type { Product } from "./TicketScreen";

const TILE_W = (SCREEN_W - 64 - 20) / 2;
const TILE_H = 112;
const GRID_TOP = 206;
const BUTTON_Y = 790;
export const quickTile = (i: number) => ({
  x: 32 + (i % 2) * (TILE_W + 20) + TILE_W / 2,
  y: GRID_TOP + Math.floor(i / 2) * (TILE_H + 18) + TILE_H / 2,
});
export const QUICK_BUTTON = { x: SCREEN_W / 2, y: BUTTON_Y };

/**
 * Two-tap sale: a catalog grid where only `pick` is tapped (at `pickAt`), the line lands on the
 * ticket, then "Cobrar" (at `chargeAt`) flips to "Venta registrada ✓" with a stamp. Unlike TicketScreen the
 * charge is only what was picked, so the rest of the catalog can sit there as context.
 */
export const QuickSaleScreen: React.FC<{ catalog: Product[]; pick: number; pickAt: number; chargeAt: number; doneLabel?: string; stamp?: string }> = ({
  catalog,
  pick,
  pickAt,
  chargeAt,
  doneLabel = "Venta registrada ✓",
  stamp = "ANOTADA",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = catalog[pick];
  const totalCents = p.priceCents * p.qty;
  const total = Math.round(totalCents * ease(frame, pickAt, 10));
  const paid = frame >= chargeAt + 6;
  const stampP = springIn(frame, chargeAt + 8, fps, 22);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <AppBar />
      <TypeToggle active="sale" />
      <Label style={{ position: "absolute", left: 32, top: 170 }}>Productos</Label>
      {catalog.map((c, i) => {
        const pos = quickTile(i);
        const isPick = i === pick;
        const hit = isPick ? interpolate(frame - pickAt, [0, 4, 12], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
        const added = isPick && frame >= pickAt;
        return (
          <div
            key={c.name}
            style={{
              position: "absolute",
              left: pos.x - TILE_W / 2,
              top: pos.y - TILE_H / 2,
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
            <span style={{ width: 46, height: 46, borderRadius: 14, background: c.swatch, flexShrink: 0 }} />
            <div style={{ lineHeight: 1.15 }}>
              <div style={{ fontSize: 24, fontWeight: 600 }}>{c.name}</div>
              <div style={{ fontSize: 22, color: colors.inkSoft }}>{formatUSD(c.priceCents)}</div>
            </div>
          </div>
        );
      })}
      <Card style={{ position: "absolute", left: 28, right: 28, top: 476, padding: "18px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 26, fontWeight: 600 }}>Ticket</span>
          <span style={{ fontSize: 20, fontFamily: fonts.mono, color: colors.inkMuted }}>{frame >= pickAt ? 1 : 0} ÍTEMS</span>
        </div>
        <div style={{ height: 2, background: colors.line, margin: "12px 0 4px" }} />
        <div style={{ minHeight: 54 }}>
          <SlideRow at={pickAt} height={54} style={{ fontSize: 24 }}>
            <span>
              <span style={{ color: colors.inkMuted, fontFamily: fonts.mono, fontSize: 21 }}>{p.qty}×</span> {p.name}
            </span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatUSD(totalCents)}</span>
          </SlideRow>
        </div>
        <div style={{ height: 2, background: colors.line, margin: "6px 0 10px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 26, color: colors.inkSoft }}>Total</span>
          <span style={{ fontSize: 46, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: colors.primary }}>{formatUSD(total)}</span>
        </div>
      </Card>
      <div style={{ position: "absolute", left: 32, right: 32, top: BUTTON_Y - 44 }}>
        <Button label={`Cobrar ${formatUSD(totalCents)}`} doneLabel={doneLabel} pressAt={chargeAt} />
      </div>
      {paid && (
        <div style={{ position: "absolute", right: 36, top: 444, padding: "10px 18px", border: `4px solid ${colors.primary}`, color: colors.primary, borderRadius: 14, fontFamily: fonts.mono, fontSize: 26, fontWeight: 500, transform: `rotate(-10deg) scale(${0.6 + stampP * 0.4})`, background: colors.paperLight }}>
          {stamp}
        </div>
      )}
      <Tap x={quickTile(pick).x + 30} y={quickTile(pick).y + 10} at={pickAt} />
      <Tap x={QUICK_BUTTON.x + 150} y={QUICK_BUTTON.y + 6} at={chargeAt} />
    </div>
  );
};
