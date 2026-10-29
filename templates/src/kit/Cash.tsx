import { colors, fonts } from "../tokens";

/** Cut-paper banknote centred on its (0,0); `label` is the printed amount (e.g. "$3"). */
export const Bill: React.FC<{ label: string; width?: number; rotate?: number }> = ({ label, width = 300, rotate = 0 }) => {
  const h = width / 2;
  return (
    <div style={{ position: "absolute", left: -width / 2, top: -h / 2, width, height: h, borderRadius: 14, background: "#8FBF8A", border: `5px solid ${colors.ink}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: fonts.sans, fontWeight: 700, fontSize: width * 0.22, color: colors.primaryDeep, transform: `rotate(${rotate}deg)`, boxSizing: "border-box" }}>
      <div style={{ position: "absolute", inset: width * 0.04, border: `3px solid ${colors.primaryDeep}`, borderRadius: 8, opacity: 0.5 }} />
      {label}
    </div>
  );
};

/** Same bill as an SVG group (for props held in the Shopkeeper's hand, viewBox space). Origin = left-middle edge. */
export const BillSvg: React.FC<{ label: string; width?: number }> = ({ label, width = 120 }) => {
  const h = width / 2;
  return (
    <g>
      <rect x={0} y={-h / 2} width={width} height={h} rx={6} fill="#8FBF8A" stroke={colors.ink} strokeWidth={4} />
      <rect x={5} y={-h / 2 + 5} width={width - 10} height={h - 10} rx={3} fill="none" stroke={colors.primaryDeep} strokeWidth={2} opacity={0.5} />
      <text x={width / 2} y={h * 0.18} textAnchor="middle" fontFamily={fonts.sans} fontWeight={700} fontSize={h * 0.55} fill={colors.primaryDeep}>
        {label}
      </text>
    </g>
  );
};

/** A coin centred on its (0,0). */
export const Coin: React.FC<{ size?: number }> = ({ size = 68 }) => (
  <div style={{ position: "absolute", left: -size / 2, top: -size / 2, width: size, height: size, borderRadius: size / 2, background: colors.accent, border: `5px solid ${colors.ink}`, boxSizing: "border-box" }}>
    <div style={{ position: "absolute", inset: size * 0.18, borderRadius: "50%", border: `3px solid ${colors.accentDeep}` }} />
  </div>
);
