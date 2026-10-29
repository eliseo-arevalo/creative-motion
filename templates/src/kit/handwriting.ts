import { loadFont } from "@remotion/google-fonts/Caveat";

/** Handwriting for notebook entries and paper notes (cut-paper props, not app UI). */
export const handFont = loadFont("normal", { weights: ["500", "700"], subsets: ["latin"] }).fontFamily;
