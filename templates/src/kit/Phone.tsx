import type { CSSProperties, ReactNode } from "react";
import { colors, fonts } from "../tokens";

export const PHONE_BEZEL = 18;

/**
 * Illustrated phone (cut-paper style: ink body, hard offset shadow).
 * Screen content is laid out in plain px inside `screenWidth × screenHeight`.
 */
export const Phone: React.FC<{
  width?: number;
  height?: number;
  children: ReactNode;
  style?: CSSProperties;
  screenBackground?: string;
}> = ({ width = 560, height = 1080, children, style, screenBackground = colors.paper }) => (
  <div
    style={{
      position: "absolute",
      width,
      height,
      borderRadius: 78,
      background: colors.ink,
      boxShadow: `14px 16px 0 rgba(30,42,36,0.18)`,
      ...style,
    }}
  >
    {/* Side buttons. */}
    <div style={{ position: "absolute", right: -7, top: 210, width: 8, height: 110, borderRadius: 4, background: colors.ink }} />
    <div style={{ position: "absolute", left: -7, top: 180, width: 8, height: 70, borderRadius: 4, background: colors.ink }} />
    <div
      style={{
        position: "absolute",
        inset: PHONE_BEZEL,
        borderRadius: 62,
        overflow: "hidden",
        background: screenBackground,
        fontFamily: fonts.sans,
        color: colors.ink,
      }}
    >
      <StatusBar />
      <div style={{ position: "absolute", left: 0, right: 0, top: 64, bottom: 0 }}>{children}</div>
    </div>
  </div>
);

const StatusBar: React.FC = () => (
  <div
    style={{
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      height: 64,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 40px",
      fontSize: 22,
      fontWeight: 600,
      fontFamily: fonts.sans,
    }}
  >
    <span>9:41</span>
    <div style={{ width: 120, height: 34, borderRadius: 17, background: colors.ink, position: "absolute", left: "50%", top: 14, marginLeft: -60 }} />
    <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <span style={{ width: 26, height: 14, borderRadius: 4, border: `2.5px solid ${colors.ink}`, display: "inline-block" }} />
    </span>
  </div>
);
