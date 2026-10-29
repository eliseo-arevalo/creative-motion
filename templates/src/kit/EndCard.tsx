import { Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Wordmark } from "../components/Layout";
import { brand, colors, display, fonts } from "../tokens";
import { drift, ease, springIn } from "./motion";
import { PopWords } from "./Words";
import { QrCode } from "./QrCode";
import { SocialIcon, type SocialKind } from "./SocialIcons";

/** Pointing hand (drawn, so it renders the same everywhere — no emoji font needed). */
export const PointRight: React.FC<{ size?: number; color?: string }> = ({ size = 64, color = colors.accent }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <rect x="40" y="36" width="54" height="18" rx="9" fill={color} stroke={colors.ink} strokeWidth="5" />
    <rect x="8" y="34" width="50" height="46" rx="16" fill={color} stroke={colors.ink} strokeWidth="5" />
    <path d="M30 54H50M30 66H48" stroke={colors.ink} strokeWidth="4.5" strokeLinecap="round" />
    <rect x="22" y="24" width="32" height="16" rx="8" fill={color} stroke={colors.ink} strokeWidth="5" transform="rotate(-8 38 32)" />
  </svg>
);

export type EndCardQr = { url: string; size?: number; label?: string };
/** Store badge: an official badge image (used unmodified) or, without one, a drawn button. */
export type EndCardStore = { badgeSrc?: string; badgeAspect?: number; height?: number; label?: string };
/** Store badge: an official badge image you place in `public/` (used unmodified) or, without one, a drawn neutral button. */
export const StoreBadge: React.FC<{ store?: EndCardStore; height?: number }> = ({ store, height }) => {
  const bh = height ?? store?.height ?? 170;
  return store?.badgeSrc ? (
    <Img src={staticFile(store.badgeSrc)} style={{ height: bh, width: Math.round(bh * (store.badgeAspect ?? 646 / 250)), display: "block" }} />
  ) : (
    <div style={{ height: bh, padding: "0 48px", display: "flex", alignItems: "center", borderRadius: 28, background: "#000", color: "#fff", border: `3px solid ${colors.paper}`, fontFamily: fonts.sans, fontWeight: 600, fontSize: Math.round(bh * 0.3) }}>
      {store?.label ?? brand.storeLabel}
    </div>
  );
};

export type EndCardSocials = { kinds: SocialKind[]; handle: string };

/**
 * Brand end card. Without `qr` it is the classic layout: wordmark pops, tagline, then a CTA pill
 * with the handle and a nudging hand. With `qr` it becomes a download card: small wordmark +
 * tagline, a big scannable QR (static once it lands, white quiet zone), the store badge and a
 * small socials row. Everything stays inside the 9:16 social safe zone (no key text in the
 * bottom 250 px or the right 200 px). Frames are local.
 */
export const BrandEndCard: React.FC<{
  tagline: string;
  cta?: string;
  handle?: string;
  at?: number;
  top?: number;
  qr?: EndCardQr;
  store?: EndCardStore;
  socials?: EndCardSocials;
  /** Download card only: the vertical axis everything is centred on (default: frame centre). */
  axis?: number;
}> = (props) => (props.qr ? <DownloadCard {...props} qr={props.qr} /> : <ClassicCard {...props} cta={props.cta ?? ""} handle={props.handle ?? ""} />);

const DownloadCard: React.FC<{ tagline: string; at?: number; top?: number; qr: EndCardQr; store?: EndCardStore; socials?: EndCardSocials; axis?: number }> = ({ tagline, at = 0, top = 150, qr, store, socials, axis }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const mark = springIn(frame, at, fps, 26);
  const card = springIn(frame, at + 14, fps, 24);
  const badge = springIn(frame, at + 28, fps, 22);
  const soc = ease(frame, at + 40, 14);
  const size = qr.size ?? 460;
  const bh = store?.height ?? 170;
  const cx = axis ?? width / 2;
  const half = Math.min(cx, width - cx);
  return (
    <div style={{ position: "absolute", left: cx - half, width: half * 2, top, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
      <div style={{ transform: `scale(${0.6 + mark * 0.4})`, opacity: mark }}>
        <Wordmark width={400} light />
      </div>
      <div style={{ ...display, fontSize: 62, color: colors.paper, marginTop: 4 }}>
        <PopWords text={tagline} start={at + 8} stagger={3} />
      </div>
      {qr.label ? (
        <div style={{ fontFamily: fonts.sans, fontWeight: 700, fontSize: 50, color: colors.accent, marginTop: 34, opacity: ease(frame, at + 16, 12) }}>{qr.label}</div>
      ) : null}
      <div
        style={{
          marginTop: 22,
          padding: 6,
          borderRadius: 34,
          background: "#FFFFFF",
          border: `5px solid ${colors.ink}`,
          boxShadow: `0 14px 0 ${colors.accent}`,
          transform: `scale(${0.4 + card * 0.6})`,
          opacity: Math.min(1, card * 2),
        }}
      >
        <QrCode url={qr.url} size={size} />
      </div>
      <div style={{ marginTop: Math.round(bh / 4) + 16, transform: `scale(${0.5 + badge * 0.5})`, opacity: Math.min(1, badge * 2) }}>
        <StoreBadge store={store} height={bh} />
      </div>
      {socials ? (
        <div style={{ marginTop: Math.round(bh / 4) + 4, display: "flex", alignItems: "center", gap: 16, opacity: soc, transform: `translateY(${(1 - soc) * 16}px)` }}>
          {socials.kinds.map((k) => (
            <SocialIcon key={k} kind={k} size={50} />
          ))}
          <span style={{ fontFamily: fonts.sans, fontWeight: 600, fontSize: 46, color: colors.paper, marginLeft: 6 }}>{socials.handle}</span>
        </div>
      ) : null}
    </div>
  );
};

const ClassicCard: React.FC<{ tagline: string; cta: string; handle: string; at?: number; top?: number }> = ({ tagline, cta, handle, at = 0, top = 520 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mark = springIn(frame, at, fps, 28);
  const line = ease(frame, at + 16, 16);
  const pill = springIn(frame, at + 30, fps, 24);
  const nudge = Math.max(0, Math.sin(((frame - at - 40) / 18) * Math.PI)) * 10;
  return (
    <div style={{ position: "absolute", left: 60, width: 820, top, textAlign: "center" }}>
      <div style={{ display: "flex", justifyContent: "center", transform: `scale(${0.6 + mark * 0.4}) rotate(${(1 - mark) * -6}deg) translateY(${drift(frame, 120, 4)}px)` }}>
        <Wordmark width={600} light />
      </div>
      <div style={{ ...display, fontSize: 84, color: colors.paper, marginTop: 10 }}>
        <PopWords text={tagline} start={at + 12} stagger={3} />
      </div>
      <div style={{ height: 8, width: 380 * line, background: colors.accent, borderRadius: 4, margin: "16px auto 0" }} />
      <div
        style={{
          margin: "70px auto 0",
          display: "inline-flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
          padding: "26px 44px",
          borderRadius: 40,
          background: colors.paper,
          color: colors.ink,
          border: `4px solid ${colors.ink}`,
          boxShadow: `8px 9px 0 ${colors.accent}`,
          transform: `scale(${pill}) rotate(${(1 - pill) * 4 - 1.5}deg)`,
        }}
      >
        <span style={{ fontFamily: fonts.sans, fontWeight: 600, fontSize: 50 }}>{cta}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 14 }}>
          <span style={{ transform: `translateX(${nudge}px)` }}>
            <PointRight size={66} />
          </span>
          <span style={{ fontFamily: fonts.sans, fontWeight: 700, fontSize: 62, color: colors.primary }}>{handle}</span>
        </span>
      </div>
    </div>
  );
};
