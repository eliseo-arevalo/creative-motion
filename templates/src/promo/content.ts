// Vertical feature promo — single source for fixtures and on-screen copy.
// Amounts are integer cents. Every balance/total is derived, never typed.
import { brand, colors } from "../tokens";
import { formatUSD, sumCents } from "../kit/money";
import type { Client, Movement, Product, Supplier } from "../kit/screens";

export const EXAMPLE_TAG = "Ejemplo";

// Sale: the ticket built on screen.
export const ticket: Product[] = [
  { name: "Arroz", priceCents: 125, qty: 2, swatch: colors.paperDeep },
  { name: "Aceite", priceCents: 375, qty: 1, swatch: colors.accent },
  { name: "Frijoles", priceCents: 140, qty: 2, swatch: "#8B4B3F" },
  { name: "Café", priceCents: 545, qty: 1, swatch: colors.primary },
];
export const ticketTotalCents = sumCents(ticket.map((p) => p.priceCents * p.qty)); // 1450

// Other sales of the week (illustrative) so the summary adds up to the ticket + these.
const otherSalesCents = [4800, 3225, 2525];
export const weekSalesCents = ticketTotalCents + sumCents(otherSalesCents); // 12000

// Fiado → abono → saldo for Ana.
export const ana = { name: "Ana", fiadoCents: 5500, abonoCents: 1500 };
export const anaBalanceCents = ana.fiadoCents - ana.abonoCents; // 4000

export const clients: Client[] = [
  { name: "Ana", note: "Al día", color: colors.accentSoft },
  { name: "Luis", note: "Al día", color: colors.primarySoft },
  { name: "Marta", note: "Al día", color: colors.paperDeep },
];

export const anaMovements: Movement[] = [
  { label: "Fiado", when: "Hoy · 10:15", cents: ana.fiadoCents, kind: "fiado" },
  { label: "Abono", when: "Hoy · 16:40", cents: ana.abonoCents, kind: "abono" },
];

// Expense: mercadería, dated yesterday, with its supplier.
export const gasto = { amountCents: 1800, concept: "Mercadería", dateLabel: "Ayer", supplier: "Distribuidora La Central" };
export const weekExpensesCents = sumCents([gasto.amountCents]); // 1800

export const suppliers: Supplier[] = [
  { name: "Lácteos Don Beto", purchases: [2200, 1850], color: colors.primarySoft },
  { name: gasto.supplier, purchases: [gasto.amountCents, 4250, 3600], color: colors.accentSoft },
  { name: "Panadería Sol", purchases: [1200, 900, 1100], color: colors.paperDeep },
];

// Summary: Te quedó = ventas − gastos. Pending = Ana's derived balance.
export const summary = {
  salesCents: weekSalesCents,
  expensesCents: weekExpensesCents,
  netCents: weekSalesCents - weekExpensesCents, // 10200
  pendingCents: anaBalanceCents,
};

export const copy = {
  hook: { eyebrow: "Para tu negocio", lines: ["Que el papeleo", "no te robe", "tiempo."], highlight: ["tiempo"] },
  problem: {
    eyebrow: "Sin libreta, sin vueltas",
    lines: ["Dejá de confiar", "en tu memoria."],
    highlight: ["memoria"],
    notes: ["¿Ana me debe…?", "¿Cuánto vendí?", "¿Le pagué al proveedor?"],
  },
  sale: { eyebrow: "Venta", lines: ["Armá el ticket.", "Cobrá en un toque."], highlight: ["toque"], caption: `${ticket.length} productos · ${formatUSD(ticketTotalCents)}` },
  fiado: { eyebrow: "Fiado", lines: ["¿Te piden fiado?", "Queda anotado."], highlight: ["anotado"], bubble: "¿Me lo anotás?" },
  abono: { eyebrow: "Abono", lines: ["Seguí atendiendo."], support: "Lo que recibís queda registrado.", highlight: ["atendiendo"] },
  gasto: { eyebrow: "Gasto", lines: ["¿Compraste", "mercadería?"], support: "Anotá el gasto, con su fecha y su proveedor.", highlight: ["mercadería"] },
  proveedores: { eyebrow: "Proveedores", lines: ["Tus proveedores,", "a mano."], support: "Sabé a quién le comprás más.", highlight: ["mano"], period: "este mes" },
  resumen: {
    sheetTitle: "Resumen de la semana",
    eyebrow: "Resumen de la semana",
    lines: ["Ventas, fiados", "y gastos, en", "un solo lugar."],
    highlight: ["lugar"],
    chips: ["Ventas", "Fiados", "Gastos"],
    support: "Así sabés cómo vas.",
  },
  end: { eyebrow: "Ventas · Fiados · Gastos · Proveedores", lines: [`Conocé ${brand.name}.`], support: brand.tagline },
} as const;
