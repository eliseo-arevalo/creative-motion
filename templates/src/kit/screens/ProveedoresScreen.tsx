import { useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../../tokens";
import { formatUSD } from "../money";
import { ease, springIn } from "../motion";
import { AppBar, Card, Initial, Label } from "./ui";

export type Supplier = { name: string; purchases: number[]; color: string };

const ROW_H = 150;

/**
 * Suppliers ranked by what you bought from them this period.
 * Totals are derived from each supplier's purchase list (cents).
 */
export const ProveedoresScreen: React.FC<{
  suppliers: Supplier[];
  period: string;
  barsAt: number;
  highlightAt: number;
  /** Name of a supplier whose latest purchase should flash as "nuevo". */
  freshName?: string;
}> = ({ suppliers, period, barsAt, highlightAt, freshName }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ranked = suppliers
    .map((s) => ({ ...s, total: s.purchases.reduce((a, b) => a + b, 0) }))
    .sort((a, b) => b.total - a.total);
  const max = ranked[0]?.total ?? 1;
  const badge = springIn(frame, highlightAt, fps, 22);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <AppBar title="Proveedores" right={<span style={{ fontSize: 40, color: colors.primary, fontWeight: 500 }}>+</span>} />
      <div style={{ margin: "8px 28px 0", height: 66, borderRadius: 33, background: colors.paperDeep, display: "flex", alignItems: "center", padding: "0 26px", fontSize: 24, color: colors.inkMuted }}>
        Buscar proveedor…
      </div>
      <Label style={{ position: "absolute", left: 32, top: 176 }}>Compras · {period}</Label>
      {ranked.map((s, i) => {
        const p = ease(frame, barsAt + i * 6, 26);
        const top = i === 0 && frame >= highlightAt;
        return (
          <Card
            key={s.name}
            style={{
              position: "absolute",
              left: 28,
              right: 28,
              top: 216 + i * ROW_H,
              height: ROW_H - 18,
              boxSizing: "border-box",
              padding: "18px 22px",
              border: `3px solid ${top ? colors.primary : "transparent"}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Initial name={s.name} color={s.color} size={50} />
              <div style={{ flex: 1, lineHeight: 1.15 }}>
                <div style={{ fontSize: 25, fontWeight: 600 }}>{s.name}</div>
                <div style={{ fontSize: 19, color: colors.inkMuted }}>
                  {s.purchases.length} compras{freshName === s.name && frame >= barsAt ? " · última: ayer" : ""}
                </div>
              </div>
              <span style={{ fontSize: 28, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{formatUSD(Math.round(s.total * p))}</span>
            </div>
            <div style={{ marginTop: 14, height: 16, borderRadius: 8, background: colors.paperDeep }}>
              <div style={{ width: `${(s.total / max) * 100 * p}%`, height: "100%", borderRadius: 8, background: i === 0 ? colors.primary : colors.accent }} />
            </div>
          </Card>
        );
      })}
      {frame >= highlightAt && (
        <div
          style={{
            position: "absolute",
            right: 40,
            top: 200,
            padding: "8px 16px",
            borderRadius: 16,
            background: colors.primary,
            color: colors.paper,
            fontSize: 21,
            fontFamily: fonts.mono,
            letterSpacing: "0.04em",
            transform: `scale(${badge}) rotate(${(1 - badge) * -8}deg)`,
            transformOrigin: "100% 50%",
          }}
        >
          LE COMPRÁS MÁS
        </div>
      )}
    </div>
  );
};
