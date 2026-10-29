import { ADULT, CHILD, basePalette, type CharacterSpec } from "@eliseo-arevalo/character-kit";
import { colors } from "../tokens";

const kitPalette = (skin: Parameters<typeof basePalette>[0]) => ({ ...basePalette(skin, colors.ink), light: colors.paperLight });

/**
 * La tendera (character-kit). Same skin tone and brand colours as the old Shopkeeper,
 * redrawn: separated fingers, no wrist seam, shaped torso, apron with bib, band, bow and pocket.
 */
export const TENDERA: CharacterSpec = {
  name: "Tendera",
  palette: kitPalette("tan"),
  proportions: { ...ADULT },
  head: { shape: "soft", nose: "curve", lashes: true },
  hair: { kind: "bun", color: colors.ink, shade: "#3A4156", shine: "#3B4D43" },
  top: { kind: "tee", color: colors.primary, shade: colors.primaryDeep, sleeve: "short" },
  bottom: { kind: "skirt", color: "#6B4A3A", shade: "#4E3529" },
  apron: { kind: "bib", color: colors.accent, shade: colors.accentDeep, outline: colors.ink, pocket: colors.accentSoft },
  shoes: { color: colors.ink, sole: "#0F1712" },
  accessories: [{ kind: "earrings", color: colors.accentDeep }],
};

/** Doña Marta (clienta): built only from kit parts — low grey bun, glasses, dotted blouse. */
export const DONA_MARTA: CharacterSpec = {
  name: "Doña Marta",
  palette: kitPalette("brown"),
  proportions: { ...ADULT, torso: 286, shoulderHalf: 102, waistHalf: 88, hipHalf: 98, headRx: 76, headRy: 86, thigh: 214, shin: 206 },
  head: { shape: "round", nose: "long", wrinkles: true, browWeight: 0.8 },
  hair: { kind: "lowBun", color: "#C9C4BA", shade: "#9E988D" },
  top: { kind: "blouse", color: "#7D5A8C", shade: "#5C4068", sleeve: "threeQuarter", trim: "#E6E8EF", pattern: "#E6E8EF" },
  bottom: { kind: "skirt", color: "#2E3E5C", shade: "#1F2A40" },
  shoes: { color: "#5A3A2A", sole: "#2E1E15" },
  accessories: [
    { kind: "glasses", color: "#5A3A2A" },
    { kind: "earrings", color: colors.accent },
    { kind: "necklace", color: colors.accent },
  ],
  breath: 0.8,
};

/** Don Beto (cliente). */
export const DON_BETO: CharacterSpec = {
  name: "Don Beto",
  palette: kitPalette("light"),
  proportions: { ...ADULT, bust: 0, torso: 310, shoulderHalf: 118, waistHalf: 92, hipHalf: 88, neckHalf: 29, headRx: 80, headRy: 88, armWidth: [42, 35, 28], hand: 86 },
  head: { shape: "oval", nose: "button", browWeight: 1.3 },
  hair: { kind: "short", color: "#3B2A20", shade: "#5A4334" },
  top: { kind: "polo", color: "#3E6FB0", shade: "#2C5287", sleeve: "short", trim: "#F4F5F8" },
  bottom: { kind: "pants", color: "#4A4037", shade: "#2F2822" },
  shoes: { color: "#2F2822" },
  accessories: [{ kind: "mustache", color: "#3B2A20" }],
};

/** Niño: CHILD proportions + cap, same parts. */
export const NINO: CharacterSpec = {
  name: "Niño",
  palette: kitPalette("tan"),
  proportions: { ...CHILD },
  head: { shape: "round", nose: "button", freckles: true },
  hair: { kind: "short", color: colors.ink, shade: "#3A4156" },
  top: { kind: "tee", color: "#E07A3F", shade: "#B85E2C", sleeve: "short" },
  bottom: { kind: "shorts", color: "#3E6FB0", shade: "#2C5287" },
  shoes: { color: "#FFFFFF", sole: colors.ink, socks: "#FFFFFF" },
  accessories: [{ kind: "cap", color: colors.primary, brim: colors.primaryDeep }],
  breath: 1.3,
};
