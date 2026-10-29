import { colors } from "../tokens";

/**
 * Cut-paper wall clock. The scene drives the hands (`minute` in degrees, hour follows at 1/12),
 * so it can tick normally or spin faster and faster ("se complica"). `shake` rattles it a bit.
 */
export const WallClock: React.FC<{ size?: number; minute: number; shake?: number; frame?: number; face?: string }> = ({ size = 220, minute, shake = 0, frame = 0, face = colors.paperLight }) => {
  const hour = minute / 12 + 300;
  const jx = Math.sin(frame * 2.3) * shake;
  const jr = Math.sin(frame * 3.1 + 1) * shake * 0.8;
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" style={{ overflow: "visible", transform: `translateX(${jx}px) rotate(${jr}deg)` }}>
      <circle cx="104" cy="106" r="88" fill="rgba(30,42,36,0.18)" />
      <circle cx="100" cy="100" r="88" fill={colors.primary} stroke={colors.ink} strokeWidth="6" />
      <circle cx="100" cy="100" r="72" fill={face} stroke={colors.ink} strokeWidth="4" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * 30 * Math.PI) / 180;
        const r1 = i % 3 === 0 ? 54 : 60;
        return <line key={i} x1={100 + Math.sin(a) * r1} y1={100 - Math.cos(a) * r1} x2={100 + Math.sin(a) * 66} y2={100 - Math.cos(a) * 66} stroke={colors.ink} strokeWidth={i % 3 === 0 ? 6 : 3.5} strokeLinecap="round" />;
      })}
      <line x1="100" y1="100" x2="100" y2="62" stroke={colors.ink} strokeWidth="9" strokeLinecap="round" transform={`rotate(${hour} 100 100)`} />
      <line x1="100" y1="100" x2="100" y2="44" stroke={colors.accentDeep} strokeWidth="6" strokeLinecap="round" transform={`rotate(${minute} 100 100)`} />
      <circle cx="100" cy="100" r="8" fill={colors.ink} />
    </svg>
  );
};

/** Minute-hand angle for a clock that runs `base` deg/frame and accelerates by `accel` deg/frame² after `from`. */
export const clockMinute = (frame: number, from = 0, base = 2, accel = 0.25) => {
  const t = Math.max(0, frame - from);
  return frame * base + 0.5 * accel * t * t;
};
