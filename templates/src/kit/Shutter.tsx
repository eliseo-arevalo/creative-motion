import type { ReactNode } from "react";
import { useId } from "react";
import { colors } from "../tokens";
import { handFont } from "./handwriting";

const METAL = "#8F9C94";
const METAL_DARK = "#6E7A73";
const METAL_LIGHT = "#B7C1BA";

/**
 * Corner-shop facade (awning, hand-painted sign, lit shelves) with a rolling metal shutter
 * ("cortina metálica"). `shutter` 0 = rolled up, 1 = down to the sidewalk; `glow` dims the
 * interior light. ViewBox 1000×1100; scale with width/height of the parent box.
 */
export const Storefront: React.FC<{
  shutter: number;
  glow?: number;
  sign?: string;
  frame?: number;
  /** Drawn inside the opening, between the lit shelves and the shutter (e.g. the shopkeeper). Opening is 700×720 at (150, 380). */
  inside?: ReactNode;
}> = ({ shutter, glow = 1, sign = "Tienda", frame = 0, inside }) => {
  const clip = useId();
  const OX = 150;
  const OY = 380;
  const OW = 700;
  const OH = 720;
  const bottom = OY + OH * Math.min(1, Math.max(0, shutter));
  const slats = Math.ceil(OH / 34);
  return (
    <svg width="100%" height="100%" viewBox="0 0 1000 1100" fill="none">
      <defs>
        <clipPath id={clip}>
          <rect x={OX} y={OY} width={OW} height={OH} />
        </clipPath>
      </defs>
      {/* Wall + base. */}
      <rect x="40" y="120" width="920" height="980" fill={colors.paperDeep} />
      <rect x="40" y="120" width="920" height="980" fill="#E3D3B5" opacity="0.45" />
      {/* Interior: warm light, shelves with products. */}
      <rect x={OX} y={OY} width={OW} height={OH} fill="#3B2F22" />
      <g clipPath={`url(#${clip})`} opacity={0.25 + 0.75 * glow}>
        <rect x={OX} y={OY} width={OW} height={OH} fill="#F2C46B" opacity="0.85" />
        {[0, 1, 2].map((r) => (
          <g key={r}>
            <rect x={OX + 30} y={OY + 150 + r * 170} width={OW - 60} height="14" fill="#A0703A" />
            {Array.from({ length: 9 }, (_, i) => {
              const h = 50 + ((i * 29 + r * 13) % 40);
              const c = [colors.primary, colors.accent, "#C94A3A", colors.paper, colors.primaryDeep][(i + r) % 5];
              return <rect key={i} x={OX + 46 + i * 70} y={OY + 150 + r * 170 - h} width="52" height={h} rx="8" fill={c} stroke={colors.ink} strokeWidth="3" />;
            })}
          </g>
        ))}
        <circle cx={OX + OW / 2} cy={OY + 40} r="26" fill="#FFF3C9" opacity={0.6 + 0.4 * glow} />
      </g>
      {inside && <g clipPath={`url(#${clip})`}>{inside}</g>}
      {/* The shutter: ridged slats coming down from the roll box, bottom bar with handle. */}
      <g clipPath={`url(#${clip})`}>
        <g transform={`translate(0 ${bottom - OY - OH})`}>
          <rect x={OX} y={OY} width={OW} height={OH} fill={METAL} />
          {Array.from({ length: slats }, (_, i) => (
            <g key={i}>
              <rect x={OX} y={OY + i * 34} width={OW} height="6" fill={METAL_LIGHT} opacity="0.8" />
              <rect x={OX} y={OY + i * 34 + 28} width={OW} height="6" fill={METAL_DARK} opacity="0.7" />
            </g>
          ))}
          <rect x={OX - 4} y={OY + OH - 26} width={OW + 8} height="26" fill={METAL_DARK} stroke={colors.ink} strokeWidth="4" />
          <rect x={OX + OW / 2 - 50} y={OY + OH - 22} width="100" height="16" rx="8" fill={colors.ink} />
        </g>
      </g>
      {/* Side rails + roll box. */}
      <rect x={OX - 22} y={OY - 6} width="22" height={OH + 6} fill={METAL_DARK} stroke={colors.ink} strokeWidth="4" />
      <rect x={OX + OW} y={OY - 6} width="22" height={OH + 6} fill={METAL_DARK} stroke={colors.ink} strokeWidth="4" />
      <rect x={OX - 30} y={OY - 64} width={OW + 60} height="64" rx="10" fill={METAL} stroke={colors.ink} strokeWidth="5" />
      <path d={`M${OX - 16} ${OY - 34}H${OX + OW + 16}`} stroke={METAL_DARK} strokeWidth="4" />
      {/* Awning: green/cream stripes with scalloped edge (sways a hair). */}
      <g transform={`translate(0 ${Math.sin(frame / 30) * 1.5})`}>
        <path d="M20 150H980L940 286H60Z" fill={colors.primary} stroke={colors.ink} strokeWidth="5" strokeLinejoin="round" />
        {Array.from({ length: 6 }, (_, i) => (
          <path key={i} d={`M${108 + i * 160} 150H${178 + i * 160}L${172 + i * 154} 286H${100 + i * 154}Z`} fill={colors.paperLight} />
        ))}
        <path d={`M60 286${Array.from({ length: 11 }, (_, i) => `Q${60 + i * 80 + 40} 336 ${60 + (i + 1) * 80} 286`).join("")}`} fill={colors.primary} stroke={colors.ink} strokeWidth="5" strokeLinejoin="round" />
      </g>
      {/* Hand-painted sign board. */}
      <rect x="300" y="30" width="400" height="104" rx="18" fill={colors.accent} stroke={colors.ink} strokeWidth="6" />
      <text x="500" y="104" textAnchor="middle" fontFamily={handFont} fontWeight="700" fontSize="78" fill={colors.ink}>
        {sign}
      </text>
      {/* Sidewalk. */}
      <rect x="0" y="1092" width="1000" height="20" fill={colors.ink} />
    </svg>
  );
};
