import { colors, fonts } from "../../tokens";
import { formatUSD } from "../money";
import { AppBar, app, Card, Label, TypeToggle } from "./ui";

export type HomeRow = { label: string; detail: string; cents: number; kind: "sale" | "debt" | "abono" | "expense" };

const tone = { sale: colors.primary, debt: colors.accentDeep, abono: colors.primary, expense: app.neu };
const sign = { sale: "+ ", debt: "", abono: "+ ", expense: "− " };

/** App home: type toggle + latest movements (a recap of everything registered). */
export const HomeScreen: React.FC<{ rows: HomeRow[] }> = ({ rows }) => (
  <div style={{ position: "absolute", inset: 0 }}>
    <AppBar />
    <TypeToggle active="sale" />
    <Label style={{ position: "absolute", left: 32, top: 176 }}>Últimos movimientos</Label>
    <Card style={{ position: "absolute", left: 28, right: 28, top: 214, padding: "6px 24px" }}>
      {rows.map((r, i) => (
        <div key={i} style={{ height: 96, display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: i ? `2px dashed ${colors.line}` : undefined }}>
          <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
            <span style={{ fontSize: 26, fontWeight: 600, color: tone[r.kind] }}>{r.label}</span>
            <span style={{ fontSize: 20, color: colors.inkMuted }}>{r.detail}</span>
          </span>
          <span style={{ fontSize: 28, fontWeight: 600, fontFamily: fonts.sans, fontVariantNumeric: "tabular-nums" }}>
            {sign[r.kind]}
            {formatUSD(r.cents)}
          </span>
        </div>
      ))}
    </Card>
  </div>
);
