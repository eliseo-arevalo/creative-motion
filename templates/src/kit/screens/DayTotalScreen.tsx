import { useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../../tokens";
import { CountUp } from "../CountUp";
import { formatUSD } from "../money";
import { springIn } from "../motion";
import { AppBar, Card, Initial, Label } from "./ui";

export type DayDebt = { name: string; cents: number; color: string };

/**
 * "Hoy" at a glance: total sold today (counts up), number of sales, and who owes you.
 * Totals are passed in already derived from the fixtures (cents).
 */
export const DayTotalScreen: React.FC<{ salesCents: number; salesCount: number; debts: DayDebt[]; at: number }> = ({ salesCents, salesCount, debts, at }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const card = (i: number) => springIn(frame, at + 8 + i * 6, fps, 22);
  const owed = debts.reduce((s, d) => s + d.cents, 0);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <AppBar />
      <div style={{ position: "absolute", left: 28, right: 28, top: 96 }}>
        <Card style={{ textAlign: "center", padding: "30px 22px", transform: `translateY(${(1 - card(0)) * 60}px)` }}>
          <Label>Vendiste hoy</Label>
          <CountUp to={salesCents} start={at + 6} duration={30} style={{ display: "block", fontSize: 96, fontWeight: 700, color: colors.primary, lineHeight: 1.15 }} />
          <div style={{ fontSize: 24, color: colors.inkSoft, fontFamily: fonts.mono }}>{salesCount} VENTAS</div>
        </Card>
        <Card style={{ marginTop: 18, transform: `translateY(${(1 - card(1)) * 80}px)` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <Label>Te deben</Label>
            <span style={{ fontSize: 40, fontWeight: 700, color: colors.accentDeep, fontVariantNumeric: "tabular-nums" }}>{formatUSD(owed)}</span>
          </div>
          {debts.map((d) => (
            <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 16, padding: "12px 14px", borderRadius: 20, background: colors.accentSoft }}>
              <Initial name={d.name} color={d.color} />
              <span style={{ flex: 1, fontSize: 28, fontWeight: 600 }}>{d.name}</span>
              <span style={{ fontSize: 28, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{formatUSD(d.cents)}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
};
