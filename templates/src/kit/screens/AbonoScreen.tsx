import { useCurrentFrame } from "remotion";
import { colors, fonts } from "../../tokens";
import { formatUSD } from "../money";
import { ease } from "../motion";
import { Tap } from "../Tap";
import { AppBar, Button, Card, Initial, Label, SCREEN_W, SlideRow, Toast } from "./ui";

export type Movement = { label: string; when: string; cents: number; kind: "fiado" | "abono" };

const BUTTON_Y = 884;

/** Client account: movements list + pending balance that updates after an abono. */
export const AbonoScreen: React.FC<{
  client: string;
  tag: string;
  movements: Movement[];
  /** Frame each movement row lands (use a negative value for "already there"). */
  rowAt: number[];
  pressAt: number;
}> = ({ client, tag, movements, rowAt, pressAt }) => {
  const frame = useCurrentFrame();
  const balance = Math.round(
    movements.reduce((sum, m, i) => sum + (m.kind === "fiado" ? m.cents : -m.cents) * ease(frame, (rowAt[i] ?? 0) + 4, 18), 0),
  );
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <AppBar title="‹ Clientes" />
      <Card style={{ position: "absolute", left: 28, right: 28, top: 92, padding: "26px 26px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Initial name={client} size={76} color={colors.accentSoft} />
          <div>
            <div style={{ fontSize: 36, fontWeight: 600 }}>{client}</div>
            <div style={{ fontSize: 19, fontFamily: fonts.mono, color: colors.inkMuted, letterSpacing: "0.08em" }}>{tag.toUpperCase()}</div>
          </div>
        </div>
        <Label style={{ marginTop: 26 }}>Saldo pendiente</Label>
        <div style={{ fontSize: 84, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: colors.ink, lineHeight: 1.1 }}>{formatUSD(balance)}</div>
      </Card>
      <Label style={{ position: "absolute", left: 32, top: 462 }}>Movimientos</Label>
      <Card style={{ position: "absolute", left: 28, right: 28, top: 500, padding: "8px 24px" }}>
        {movements.map((m, i) => (
          <SlideRow key={`${m.label}-${i}`} at={rowAt[i] ?? 0} height={84} style={{ borderTop: i ? `2px dashed ${colors.line}` : undefined }}>
            <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
              <span style={{ fontSize: 27, fontWeight: 600, color: m.kind === "abono" ? colors.primary : colors.accentDeep }}>{m.label}</span>
              <span style={{ fontSize: 20, color: colors.inkMuted }}>{m.when}</span>
            </span>
            <span style={{ fontSize: 30, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: m.kind === "abono" ? colors.primary : colors.ink }}>
              {m.kind === "abono" ? "− " : "+ "}
              {formatUSD(m.cents)}
            </span>
          </SlideRow>
        ))}
      </Card>
      <div style={{ position: "absolute", left: 32, right: 32, top: BUTTON_Y - 44 }}>
        <Button label="Registrar abono" doneLabel="Abono registrado ✓" pressAt={pressAt} />
      </div>
      <Toast at={pressAt + 14} style={{ top: BUTTON_Y - 170 }}>
        <span>Queda registrado en la cuenta de {client}</span>
      </Toast>
      <Tap x={SCREEN_W / 2 + 70} y={BUTTON_Y + 6} at={pressAt} />
    </div>
  );
};
