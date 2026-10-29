import { colors } from "../tokens";

/**
 * A cellphone lying on the counter that buzzes and rattles while ringing (`ringAt`…`stopAt`,
 * local frames), with sound arcs pulsing around it. Pair with a ringtone SFX.
 */
export const RingingPhone: React.FC<{ frame: number; ringAt: number; stopAt?: number; width?: number }> = ({ frame, ringAt, stopAt = 1e9, width = 150 }) => {
  const ringing = frame >= ringAt && frame < stopAt;
  const buzz = ringing ? Math.sin(frame * 2.9) * 5 : 0;
  const tilt = ringing ? Math.sin(frame * 2.1) * 6 : 0;
  const h = width * 1.9;
  return (
    <div style={{ position: "relative", width, height: h, transform: `translateX(${buzz}px) rotate(${tilt}deg)` }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: width * 0.18, background: colors.ink, boxShadow: "8px 10px 0 rgba(30,42,36,0.25)" }} />
      <div style={{ position: "absolute", inset: width * 0.07, borderRadius: width * 0.12, background: ringing && Math.floor(frame / 4) % 2 ? colors.accent : colors.primary, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width={width * 0.5} height={width * 0.5} viewBox="0 0 24 24">
          <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z" fill={colors.paper} />
        </svg>
      </div>
      {ringing &&
        [0, 1, 2].map((i) => {
          const p = ((frame - ringAt + i * 6) % 18) / 18;
          return (
            <div key={i} style={{ position: "absolute", left: -width * (0.2 + p * 0.5), right: -width * (0.2 + p * 0.5), top: -width * (0.2 + p * 0.5), bottom: -width * (0.2 + p * 0.5), borderRadius: "50%", border: "7px solid transparent", borderLeftColor: colors.accent, borderRightColor: colors.accent, opacity: 1 - p, pointerEvents: "none" }} />
          );
        })}
    </div>
  );
};
