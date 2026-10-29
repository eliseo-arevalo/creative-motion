import type { CSSProperties } from "react";
import { loadFont as loadLora } from "@remotion/google-fonts/Lora";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadJetBrainsMono } from "@remotion/google-fonts/JetBrainsMono";
import brandJson from "./brand.json";

/** Brand identity of the demo. Copy this folder to `brands/private-<id>/` for a real brand. */
export const brand = brandJson;

/** Neutral example palette. Keys are semantic roles, not hues: `primary` = the brand colour, `accent` = highlight. */
export const colors = {
  ink: "#1F2433",
  paper: "#F4F5F8",
  paperLight: "#FBFBFD",
  paperDeep: "#E6E8EF",
  surface: "#FFFFFF",
  inkSoft: "#4B5368",
  inkMuted: "#8B91A3",
  line: "rgba(31,36,51,0.08)",
  lineStrong: "rgba(31,36,51,0.14)",
  accent: "#F2994A",
  accentDeep: "#B4661C",
  accentSoft: "#FBE1C4",
  primary: "#3D52D5",
  primaryDeep: "#28378F",
  primarySoft: "#D9DEF8",
} as const;

export type BrandColor = keyof typeof colors;

export const fonts = {
  display: loadLora("normal", { weights: ["500", "600"], subsets: ["latin"] }).fontFamily,
  sans: loadInter("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] }).fontFamily,
  mono: loadJetBrainsMono("normal", { weights: ["400", "500"], subsets: ["latin"] }).fontFamily,
};

export const display: CSSProperties = {
  fontFamily: fonts.display,
  fontWeight: 500,
  letterSpacing: "-0.04em",
  lineHeight: 1.04,
};

export const eyebrow: CSSProperties = {
  fontFamily: fonts.mono,
  fontWeight: 500,
  fontSize: 24,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
};
