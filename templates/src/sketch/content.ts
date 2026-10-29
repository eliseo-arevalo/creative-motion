// Character sketch ("later I'll note it down") — fixtures and on-screen copy in one place (example content).
// Amounts are integer cents; every total is derived, never typed.
import { brand, colors } from "../tokens";
import { formatUSD } from "../kit/money";
import type { Product } from "../kit/screens";

// The $3 sale that gets lost (and, after the rewind, noted in two taps).
export const lostSaleCents = 300;
export const catalog: Product[] = [
  { name: "Queso", priceCents: lostSaleCents, qty: 1, swatch: colors.accentSoft },
  { name: "Pan dulce", priceCents: 25, qty: 1, swatch: "#C9935A" },
  { name: "Tortillas", priceCents: 100, qty: 1, swatch: colors.paperDeep },
  { name: "Gaseosa", priceCents: 90, qty: 1, swatch: "#8B4B3F" },
];
export const PICK = 0; // the queso, $3.00

// The rush that follows: each one is a sale that also doesn't get noted (the tally counts them).
export const rushCents = [125, 50, 500, 75, 200, 150];
export const unnotedCount = 1 + rushCents.length; // 7

// The notebook at night: entries she did write, and the $3 she can't place.
export const notebook = {
  left: [{ text: "Pan ... $1.25" }, { text: "Tortillas ... $1" }, { text: "Gaseosa ... $0.90" }, { text: "¿Queso? ¿Fiado?", strikeAt: 0 }],
  right: [{ text: `${formatUSD(lostSaleCents).replace(".00", "")} ¿¿??`, color: "#C94A3A" }, { text: "¿de quién?", color: "#C94A3A" }],
};

export const STORE_URL = brand.storeUrl;

export const copy = {
  hook: ["Cuando decís", "“después lo apunto”…"],
  bubble: "Ahorita lo apunto…",
  tallyOne: "venta\nsin anotar…",
  tallyMany: "ventas\nsin anotar…",
  kid: "¡Seño, un chicle!",
  phone: "¿Aló?",
  punch: ["¿Y esos $3", "de quién eran?"],
  redo: ["Apuntala cuando pase.", "Son 2 segundos."],
  done: "¡Listo, apuntado!",
  tagline: brand.tagline,
  cta: ["Etiquetá a quien", "siempre dice", "“ahorita lo apunto”"],
  handle: brand.handle,
  rewind: "",
} as const;

export const money = { lost: formatUSD(lostSaleCents).replace(".00", "") };
