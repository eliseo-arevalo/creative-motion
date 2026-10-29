// Problem/solution reel — fixtures and on-screen copy in one place (example content: a small-shop sales app).
// Amounts are integer cents; every total is derived, never typed.
import { brand, colors } from "../tokens";
import { formatUSD, sumCents } from "../kit/money";
import type { Client, DayDebt, Product } from "../kit/screens";

// The sale noted on the phone (same one she charged in the hook).
export const ticket: Product[] = [
  { name: "Arroz", priceCents: 125, qty: 2, swatch: colors.paperDeep },
  { name: "Aceite", priceCents: 375, qty: 1, swatch: colors.accent },
  { name: "Gaseosa", priceCents: 90, qty: 1, swatch: "#8B4B3F" },
];
export const ticketTotalCents = sumCents(ticket.map((p) => p.priceCents * p.qty)); // 715
export const paidCents = 1000;
export const changeCents = paidCents - ticketTotalCents; // 285

// The rush of quick sales in the hook (each pops as "+$x"), then the rest of the day.
export const rushCents = [240, 1275, 150, 500];
// Rest of the day's sales (illustrative) so "Vendiste hoy" = ticket + rush + these.
const otherSalesCents = [...rushCents, 2375, 660, 1840, 905, 3120, 1415];
export const salesCount = otherSalesCents.length + 1; // 11
export const daySalesCents = ticketTotalCents + sumCents(otherSalesCents); // 13195

// Fiado to Doña Marta, plus one older debt so "te deben" is a list, not a single row.
export const marta = { name: "Doña Marta", fiadoCents: 850 };
const luis = { name: "Luis", cents: 300 };
export const clients: Client[] = [
  { name: marta.name, note: "Al día", color: colors.accentSoft },
  { name: "Luis", note: `Debe ${formatUSD(luis.cents)}`, color: colors.primarySoft },
  { name: "Ana", note: "Al día", color: colors.paperDeep },
];
export const debts: DayDebt[] = [
  { name: marta.name, cents: marta.fiadoCents, color: colors.accentSoft },
  { name: luis.name, cents: luis.cents, color: colors.primarySoft },
];
export const owedCents = sumCents(debts.map((d) => d.cents)); // 1150

// The old way: notebook + loose papers (handwritten, with tachones).
export const notebook = {
  left: [
    { text: "Arroz 2 ... $2.50" },
    { text: "Gaseosa ... $1.80", strikeAt: 0 },
    { text: "Marta fió $8.?", blot: true },
    { text: "Pan ... $1.25" },
    { text: "Luis debe ¿$3?", strikeAt: 0 },
  ],
  right: [
    { text: "Total: $142", strikeAt: 0 },
    { text: "$148.50 ??", strikeAt: 0 },
    { text: "¿$15...?", color: "#C94A3A" },
  ],
};
export const papers = {
  sticky: ["Marta", "$8.50 ?"],
  torn: ["2 aceites", "fiado"],
  receipt: ["TOTAL", "$12.75"],
  phone: ["vendí ¿45?", "Luis $3 ok"],
};

// Store link for the end-card QR: comes from the brand (brands/<id>/brand.json → storeUrl).
export const STORE_URL = brand.storeUrl;

export const copy = {
  hook: ["Atendés", "todo el día…"],
  problem: ["¿Y dónde queda", "el registro?"],
  ask: ["¿Cuánto gané hoy?", "¿Y quién me debe?"],
  sale: ["Registrá cada venta", "en segundos"],
  debt: ["Sabé quién", "te debe"],
  total: ["Sabé cuánto", "vendiste"],
  relief: ["Cobrá. Fiá.", "Tené todo claro."],
  tagline: brand.tagline,
  cta: "See how it works",
  handle: brand.handle,
  scan: "Scan to download",
  sign: "La Tiendita",
} as const;

export const money = { ticket: formatUSD(ticketTotalCents), change: formatUSD(changeCents), paid: formatUSD(paidCents).replace(".00", ""), fiado: formatUSD(marta.fiadoCents) };
