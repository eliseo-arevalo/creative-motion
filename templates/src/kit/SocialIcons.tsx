import { colors } from "../tokens";

export type SocialKind = "tiktok" | "instagram";

/** Simple monochrome glyphs for social handles (drawn, no icon font needed). */
export const SocialIcon: React.FC<{ kind: SocialKind; size?: number; color?: string }> = ({ kind, size = 52, color = colors.paper }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {kind === "tiktok" ? (
      <path
        fill={color}
        d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48z"
      />
    ) : (
      <>
        <rect x="3" y="3" width="18" height="18" rx="5.2" stroke={color} strokeWidth="2.1" />
        <circle cx="12" cy="12" r="4.1" stroke={color} strokeWidth="2.1" />
        <circle cx="17.3" cy="6.7" r="1.25" fill={color} />
      </>
    )}
  </svg>
);
