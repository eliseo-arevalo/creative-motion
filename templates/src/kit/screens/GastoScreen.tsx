import { useCurrentFrame, useVideoConfig } from "remotion";
import { colors } from "../../tokens";
import { formatUSD } from "../money";
import { ease, springIn } from "../motion";
import { Tap } from "../Tap";
import { AppBar, app, Button, Card, Chip, Label, SCREEN_W, Toast, TypeToggle, type TxType } from "./ui";

const BUTTON_Y = 884;
const DATE_OPTIONS = ["Hoy", "Ayer", "Otra fecha"];

/** Registrar gasto: monto, concepto, fecha y proveedor (opcional), then save. */
export const GastoScreen: React.FC<{
  amountCents: number;
  concept: string;
  dateLabel: string;
  provider: string;
  from?: TxType;
  switchAt: number;
  amountAt: number;
  conceptAt: number;
  dateAt: number;
  providerAt: number;
  saveAt: number;
}> = ({ amountCents, concept, dateLabel, provider, from = "sale", switchAt, amountAt, conceptAt, dateAt, providerAt, saveAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const amount = Math.round(amountCents * ease(frame, amountAt, 16));
  const typed = concept.slice(0, Math.floor(ease(frame, conceptAt, 16) * concept.length));
  const dateIdx = Math.max(0, DATE_OPTIONS.indexOf(dateLabel));
  const datePicked = frame >= dateAt;
  const provPop = springIn(frame, providerAt, fps, 20);
  const provPicked = frame >= providerAt;
  const caret = Math.floor(frame / 8) % 2 === 0 && frame >= conceptAt && frame < conceptAt + 24;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <AppBar />
      <TypeToggle active="expense" from={from} switchAt={switchAt} />
      <div style={{ position: "absolute", left: 32, right: 32, top: 172, textAlign: "center" }}>
        <Label>Monto del gasto</Label>
        <div style={{ fontSize: 92, fontWeight: 700, color: app.neu, fontVariantNumeric: "tabular-nums", lineHeight: 1.1, marginTop: 6 }}>{formatUSD(amount)}</div>
      </div>
      <Card style={{ position: "absolute", left: 28, right: 28, top: 352, padding: "22px 24px" }}>
        <Label>Concepto</Label>
        <div style={{ fontSize: 32, fontWeight: 600, height: 48, marginTop: 6, borderBottom: `2px solid ${colors.line}` }}>
          {typed}
          {caret && <span style={{ color: app.neu }}>|</span>}
        </div>
        <Label style={{ marginTop: 22 }}>Fecha</Label>
        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          {DATE_OPTIONS.map((d, i) => (
            <Chip key={d} active={datePicked ? i === dateIdx : i === 0} color={app.neu}>
              {d}
            </Chip>
          ))}
        </div>
        <Label style={{ marginTop: 22 }}>Proveedor (opcional)</Label>
        <div style={{ marginTop: 10, height: 60, position: "relative" }}>
          {!provPicked ? (
            <Chip>+ Seleccionar proveedor</Chip>
          ) : (
            <span style={{ display: "inline-flex", transform: `scale(${0.7 + provPop * 0.3})`, transformOrigin: "0 50%" }}>
              <Chip active color={colors.ink}>
                <span style={{ width: 14, height: 14, borderRadius: 7, background: colors.accent, display: "inline-block" }} /> {provider}
              </Chip>
            </span>
          )}
        </div>
      </Card>
      <div style={{ position: "absolute", left: 32, right: 32, top: BUTTON_Y - 44 }}>
        <Button label="Guardar gasto" doneLabel="Gasto guardado ✓" pressAt={saveAt} color={app.neu} doneColor={colors.primary} />
      </div>
      <Toast at={saveAt + 10} color={app.neu} style={{ top: BUTTON_Y - 156 }}>
        <span>
          {concept} · {dateLabel} · {provider}
        </span>
      </Toast>
      <Tap x={SCREEN_W - 120} y={117} at={switchAt} />
      <Tap x={32 + 24 + 140 + dateIdx * 10} y={352 + 22 + 19 + 6 + 48 + 22 + 19 + 10 + 24} at={dateAt} />
      <Tap x={180} y={352 + 400} at={providerAt} />
      <Tap x={SCREEN_W / 2 + 60} y={BUTTON_Y + 6} at={saveAt} />
    </div>
  );
};
