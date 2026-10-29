import { useCurrentFrame } from "remotion";
import { colors, fonts } from "../../tokens";
import { formatUSD } from "../money";
import { ease } from "../motion";
import { Tap } from "../Tap";
import { AppBar, Button, Initial, Label, SCREEN_W, Toast, TypeToggle } from "./ui";

export type Client = { name: string; note: string; color: string };

const LIST_TOP = 400;
const ROW_H = 92;
const BUTTON_Y = 884;

/** Fiar: amount on top, pick the client, confirm → "Fiado anotado". */
export const FiadoScreen: React.FC<{
  clients: Client[];
  selected: number;
  amountCents: number;
  switchAt: number;
  amountAt: number;
  pickAt: number;
  confirmAt: number;
}> = ({ clients, selected, amountCents, switchAt, amountAt, pickAt, confirmAt }) => {
  const frame = useCurrentFrame();
  const amount = Math.round(amountCents * ease(frame, amountAt, 16));
  const picked = frame >= pickAt;
  const hi = ease(frame, pickAt, 8);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <AppBar />
      <TypeToggle active="debt" from="sale" switchAt={switchAt} />
      <div style={{ position: "absolute", left: 32, right: 32, top: 172, textAlign: "center" }}>
        <Label>Monto a fiar</Label>
        <div style={{ fontSize: 92, fontWeight: 700, color: colors.accentDeep, fontVariantNumeric: "tabular-nums", lineHeight: 1.1, marginTop: 6 }}>
          {formatUSD(amount)}
        </div>
      </div>
      <Label style={{ position: "absolute", left: 32, top: LIST_TOP - 40 }}>¿A quién le fiás?</Label>
      {clients.map((c, i) => {
        const isSel = i === selected && picked;
        return (
          <div
            key={c.name}
            style={{
              position: "absolute",
              left: 28,
              right: 28,
              top: LIST_TOP + i * ROW_H,
              height: ROW_H - 12,
              borderRadius: 22,
              background: isSel ? colors.accentSoft : colors.surface,
              border: `3px solid ${isSel ? colors.accentDeep : "transparent"}`,
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "0 20px",
              transform: `scale(${isSel ? 1 + 0.03 * Math.sin(hi * Math.PI) : 1})`,
            }}
          >
            <Initial name={c.name} color={c.color} />
            <div style={{ flex: 1, lineHeight: 1.15 }}>
              <div style={{ fontSize: 27, fontWeight: 600 }}>{c.name}</div>
              <div style={{ fontSize: 20, color: colors.inkMuted }}>{c.note}</div>
            </div>
            {isSel && (
              <span style={{ width: 40, height: 40, borderRadius: 20, background: colors.accentDeep, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="24" height="24" viewBox="0 0 80 80" fill="none"><path d="M15 40L33 58L66 23" stroke={colors.paper} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
            )}
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 32, right: 32, top: BUTTON_Y - 44 }}>
        <Button label="Anotar fiado" doneLabel="Anotado ✓" pressAt={confirmAt} color={colors.accentDeep} doneColor={colors.primary} />
      </div>
      <Toast at={confirmAt + 8} color={colors.accentDeep} style={{ top: BUTTON_Y - 170 }}>
        <span>
          Fiado a <b>{clients[selected].name}</b> · <span style={{ fontFamily: fonts.mono }}>{formatUSD(amountCents)}</span>
        </span>
      </Toast>
      <Tap x={SCREEN_W - 120} y={LIST_TOP + selected * ROW_H + (ROW_H - 12) / 2} at={pickAt} />
      <Tap x={SCREEN_W / 2 + 40} y={BUTTON_Y + 6} at={confirmAt} />
    </div>
  );
};
