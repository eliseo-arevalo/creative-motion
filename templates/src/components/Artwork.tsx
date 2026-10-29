import { useId } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../tokens";
import { pop, progress } from "@eliseo-arevalo/motion-kit";

const skin = "#C9825C";
const skinLight = "#E4AD87";

export const Spark: React.FC<{ size?: number; color?: string }> = ({
  size = 80,
  color = colors.accent,
}) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <path
      d="M50 0L60 34L85 15L66 40L100 50L66 60L85 85L60 66L50 100L40 66L15 85L34 60L0 50L34 40L15 15L40 34Z"
      fill={color}
    />
  </svg>
);

export const ReceiptIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 100,
  color = colors.ink,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    stroke={color}
    strokeWidth="5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M23 12H77V88L68 81L59 88L50 81L41 88L32 81L23 88Z" />
    <path d="M36 31H64M36 45H64M36 59H51" />
  </svg>
);

export const PersonIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 100,
  color = colors.ink,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    stroke={color}
    strokeWidth="5"
    strokeLinecap="round"
  >
    <circle cx="50" cy="30" r="17" />
    <path d="M18 85V76C18 42 82 42 82 76V85" />
  </svg>
);

export const CoinIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 100,
  color = colors.ink,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    stroke={color}
    strokeWidth="5"
    strokeLinecap="round"
  >
    <circle cx="50" cy="50" r="35" />
    <path d="M61 33H45C29 33 30 50 46 50H54C70 50 70 68 54 68H38M50 24V76" />
  </svg>
);

// Original cut-paper shopkeeper. Motion belongs to the arm/head, not a floating UI.
export const CounterArt: React.FC<{ compact?: boolean; start?: number }> = ({
  compact = false,
  start = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const counterClip = useId();
  const enter = pop(frame, start, fps, 38);
  const hand = progress(frame, start + 40, 40);
  const nod = Math.sin(Math.max(0, frame - start - 35) / 34) * 2;
  const receipt = pop(frame, start + 58, fps, 34);
  return (
    <svg width="100%" height="100%" viewBox="0 0 900 820" fill="none">
      <defs>
        <clipPath id={counterClip}>
          <rect x="0" y="0" width="900" height="628" />
        </clipPath>
      </defs>
      <path
        d="M106 638V295C106 72 770 41 796 325V638Z"
        fill={colors.primarySoft}
      />
      <path
        d="M128 662H781"
        stroke={colors.ink}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <g clipPath={`url(#${counterClip})`}>
        <g transform={`translate(0 ${(1 - enter) * 700})`}>
          {/* Hair, face and expressive small smile. */}
          <g transform={`rotate(${nod} 470 306)`}>
            <path
              d="M361 295C326 262 341 161 385 135C434 73 545 116 564 169C610 215 576 293 539 319Z"
              fill={colors.ink}
            />
            <path d="M438 300L434 359L505 367L506 285" fill={skin} />
            <ellipse cx="462" cy="235" rx="77" ry="92" fill={skinLight} />
            <path
              d="M379 212C370 112 522 94 542 205C495 205 458 177 441 154C427 193 408 204 379 212Z"
              fill={colors.ink}
            />
            <ellipse cx="388" cy="250" rx="16" ry="24" fill={skinLight} />
            <path
              d="M448 239V245M501 236V242"
              stroke={colors.ink}
              strokeWidth="7"
              strokeLinecap="round"
            />
            <path
              d="M470 250L466 268H477M451 284Q473 301 493 280"
              stroke={colors.ink}
              strokeWidth="4"
              strokeLinecap="round"
            />
          </g>
          <path
            d="M435 337C382 339 341 363 321 419L282 586L651 605L609 423C595 371 552 345 506 337Q478 378 435 337Z"
            fill={colors.primary}
          />
          <path
            d="M412 355L402 410H528L522 354M400 410L377 599H558L535 410"
            fill={colors.accent}
            stroke={colors.ink}
            strokeWidth="5"
            strokeLinejoin="round"
          />
          <path d="M434 493H498V540H434Z" fill={colors.paper} />
          <path
            d="M336 429L299 568Q293 603 339 606L435 587"
            stroke={skinLight}
            strokeWidth="42"
            strokeLinecap="round"
          />
          <g transform={`rotate(${-hand * 12} 586 430)`}>
            <path
              d="M588 428L636 527L707 481"
              stroke={skinLight}
              strokeWidth="42"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M704 482L713 454M708 483L735 467"
              stroke={skinLight}
              strokeWidth="15"
              strokeLinecap="round"
            />
          </g>
          <g
            transform={`translate(650 ${362 + (1 - receipt) * 130}) rotate(9 700 400) scale(${receipt})`}
          >
            <path
              d="M0 0H108V142L94 133L80 142L66 133L52 142L38 133L24 142L10 133L0 142Z"
              fill={colors.paper}
              stroke={colors.ink}
              strokeWidth="4"
            />
            <path
              d="M21 28H85M21 44H72"
              stroke={colors.ink}
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M27 87L45 105L81 70"
              stroke={colors.primary}
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength="1"
              strokeDasharray="1"
              strokeDashoffset={1 - progress(frame, start + 78, 24)}
            />
          </g>
        </g>
      </g>
      {/* Business-neutral parcels and counter; no retail-category identity. */}
      <rect
        x="122"
        y="524"
        width="145"
        height="97"
        rx="8"
        fill={colors.paper}
        stroke={colors.ink}
        strokeWidth="5"
      />
      <path d="M194 524V564M169 564H216" stroke={colors.ink} strokeWidth="5" />
      <rect x="82" y="611" width="745" height="35" rx="17" fill={colors.ink} />
      <path d="M113 646H797L771 782H136Z" fill={colors.accent} />
      <path
        d="M148 672H753M162 694H740"
        stroke={colors.accentDeep}
        strokeWidth="3"
      />
      {!compact && (
        <text
          x="454"
          y="754"
          textAnchor="middle"
          fill={colors.ink}
          fontFamily={fonts.sans}
          fontSize="34"
          fontWeight="500"
        >
          Tu negocio, todos los días.
        </text>
      )}
    </svg>
  );
};

export const Avatar: React.FC<{ variant?: number; size?: number }> = ({
  variant = 0,
  size = 100,
}) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <circle
      cx="50"
      cy="50"
      r="49"
      fill={variant % 2 ? colors.accent : colors.primarySoft}
    />
    <path
      d="M13 100Q12 65 50 65Q88 65 87 100"
      fill={variant % 2 ? colors.primary : colors.ink}
    />
    <path d="M39 57V75Q51 85 61 74V57" fill={skin} />
    <ellipse cx="50" cy="42" rx="23" ry="29" fill={skinLight} />
    <path
      d={
        variant % 2
          ? "M26 37Q19 5 50 9Q78 9 76 39L63 23Q47 35 26 37Z"
          : "M25 47Q17 7 47 8Q83 3 76 49L65 26L34 28Z"
      }
      fill={colors.ink}
    />
    <path
      d="M41 43V45M58 43V45M44 56Q51 61 57 55"
      fill="none"
      stroke={colors.ink}
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);
