import type { CharacterSpec, Palette, Proportions } from "./types";

/** Body proportions to start from (canvas px). Spread and override per character. */
export const ADULT: Proportions = {
  torso: 292,
  shoulderHalf: 100,
  shoulderDrop: 30,
  waistHalf: 74,
  hipHalf: 90,
  neck: 30,
  neckHalf: 24,
  headRx: 84,
  headRy: 96,
  upperArm: 124,
  foreArm: 112,
  hand: 88,
  armWidth: [40, 34, 28],
  thigh: 210,
  shin: 200,
  legWidth: [52, 40, 30],
  legGap: 40,
  bust: 1,
};

/** Child: big head, short limbs, narrow shoulders (same parts, other numbers). */
export const CHILD: Proportions = {
  ...ADULT,
  torso: 196,
  shoulderHalf: 74,
  shoulderDrop: 22,
  waistHalf: 62,
  hipHalf: 66,
  neck: 24,
  neckHalf: 19,
  headRx: 74,
  headRy: 82,
  upperArm: 88,
  foreArm: 80,
  hand: 60,
  armWidth: [30, 26, 22],
  thigh: 150,
  shin: 140,
  legWidth: [38, 30, 24],
  legGap: 28,
  bust: 0,
};

export const SKIN = {
  light: { skin: "#F1C6A6", skinShade: "#D9A07D", skinDeep: "#C08263", blush: "#EC8F7C" },
  tan: { skin: "#E2A47C", skinShade: "#C9825C", skinDeep: "#B06E4B", blush: "#E27F6A" },
  brown: { skin: "#B97A55", skinShade: "#9A5F40", skinDeep: "#7E4A31", blush: "#C96A55" },
  deep: { skin: "#8A5A3C", skinShade: "#70462D", skinDeep: "#5A3622", blush: "#A9563F" },
} as const;

/** Neutral palette (no brand). */
export const basePalette = (skin: keyof typeof SKIN = "tan", ink = "#1E2A24"): Palette => ({
  ...SKIN[skin],
  ink,
  mouth: "#6E2A25",
  tongue: "#E58F7F",
  teeth: "#FFFFFF",
  light: "#FFFFFF",
});

/** A brand-free demo character to copy from. */
export const DEMO_CHARACTER: CharacterSpec = {
  name: "Demo",
  palette: basePalette("light"),
  proportions: { ...ADULT, bust: 0, shoulderHalf: 112, waistHalf: 84, hipHalf: 86 },
  head: { shape: "round", nose: "button" },
  hair: { kind: "short", color: "#3B2A20", shade: "#5A4334" },
  top: { kind: "tee", color: "#3E6FB0", shade: "#2C5287", sleeve: "short" },
  bottom: { kind: "pants", color: "#2F3A4A", shade: "#1E2733" },
  shoes: { color: "#FFFFFF", sole: "#2F3A4A" },
};
