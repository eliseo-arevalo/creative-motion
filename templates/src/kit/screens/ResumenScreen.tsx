import { useCurrentFrame, useVideoConfig } from "remotion";
import { colors } from "../../tokens";
import { CountUp } from "../CountUp";
import { springIn } from "../motion";
import { app, Card, Label } from "./ui";

/** Day summary sheet: "Te quedó" = ventas − gastos, plus what clients still owe. */
export const ResumenScreen: React.FC<{
  salesCents: number;
  expensesCents: number;
  pendingCents: number;
  at: number;
  title?: string;
}> = ({ salesCents, expensesCents, pendingCents, at, title = "Resumen de hoy" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const net = salesCents - expensesCents;
  const sheet = springIn(frame, at - 6, fps, 26);
  const card = (i: number) => springIn(frame, at + 10 + i * 6, fps, 22);
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(30,42,36,0.16)" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 60,
          bottom: 0,
          background: colors.paper,
          borderRadius: "44px 44px 0 0",
          transform: `translateY(${(1 - sheet) * 900}px)`,
          padding: "22px 28px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ width: 80, height: 8, borderRadius: 4, background: colors.lineStrong, margin: "0 auto 26px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 30, fontWeight: 600 }}>{title}</span>
          <span style={{ width: 48, height: 48, borderRadius: 24, background: colors.paperDeep, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 26, color: colors.inkSoft }}>×</span>
        </div>
        <div style={{ textAlign: "center", marginTop: 44 }}>
          <div style={{ fontSize: 28, color: colors.inkSoft }}>Te quedó</div>
          <CountUp to={net} start={at + 6} duration={30} style={{ fontSize: 104, fontWeight: 700, color: colors.primary, lineHeight: 1.15 }} />
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 36 }}>
          {[
            { label: "Vendiste", cents: salesCents, color: colors.primary },
            { label: "Gastaste", cents: expensesCents, color: app.neu },
          ].map((c, i) => (
            <Card key={c.label} style={{ flex: 1, transform: `translateY(${(1 - card(i)) * 80}px)` }}>
              <Label>{c.label}</Label>
              <CountUp to={c.cents} start={at + 12 + i * 6} duration={24} style={{ fontSize: 40, fontWeight: 700, color: c.color }} />
            </Card>
          ))}
        </div>
        <Card style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center", transform: `translateY(${(1 - card(2)) * 80}px)` }}>
          <div>
            <Label>Fiados por cobrar</Label>
            <div style={{ fontSize: 22, color: colors.inkSoft, marginTop: 4 }}>Saldo de tus clientes</div>
          </div>
          <CountUp to={pendingCents} start={at + 24} duration={24} style={{ fontSize: 40, fontWeight: 700, color: colors.accentDeep }} />
        </Card>
      </div>
    </div>
  );
};
