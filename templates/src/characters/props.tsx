import type { HoldRender } from "@eliseo-arevalo/character-kit";
import { colors } from "../tokens";

/**
 * Props for character-kit hands. Grip contract: the object is drawn centred on the hand's slot,
 * ~44 px wide, so the "hold" fingers wrap its −x edge and the thumb sits on the +x edge.
 * "pinch" objects hang from the slot (the point between thumb and index).
 */
export const PHONE: HoldRender = () => (
  <g>
    <rect x={-22} y={-42} width={44} height={84} rx={9} fill={colors.ink} />
    <rect x={-17} y={-34} width={34} height={64} rx={4} fill={colors.primarySoft} />
    <rect x={-11} y={-27} width={22} height={6} rx={3} fill={colors.primary} />
    <rect x={-11} y={-16} width={15} height={5} rx={2.5} fill={colors.accent} />
  </g>
);

export const NOTEBOOK: HoldRender = () => (
  <g transform="translate(10 0)">
    <rect x={-32} y={-44} width={64} height={86} rx={6} fill={colors.accent} stroke={colors.ink} strokeWidth={3} />
    <rect x={-22} y={-32} width={40} height={22} rx={3} fill={colors.paperLight} />
    <path d="M-32 -30h-5M-32 -12h-5M-32 6h-5M-32 24h-5" stroke={colors.ink} strokeWidth={3} strokeLinecap="round" />
  </g>
);

export const BOX: HoldRender = () => (
  <g transform="rotate(90)">
    <rect x={-34} y={-24} width={68} height={48} rx={7} fill={colors.accentSoft} stroke={colors.ink} strokeWidth={3} />
    <path d="M-34 -6H34" stroke={colors.accentDeep} strokeWidth={3} />
  </g>
);

/** A banknote held by a corner between thumb and index. */
export const BILL: HoldRender = () => (
  <g transform="rotate(58) translate(-9 -7)">
    <rect x={0} y={0} width={70} height={40} rx={4} fill={colors.primarySoft} stroke={colors.primaryDeep} strokeWidth={3} />
    <circle cx={38} cy={20} r={9} fill="none" stroke={colors.primaryDeep} strokeWidth={2.5} />
  </g>
);
