import type { CartItem } from "./cart";

/** Every price rule of the cart and checkout, in naira. */
export const PRICING = {
  freeDeliveryFrom: 1_500_000,
  delivery: 25_000,
  expressSurcharge: 40_000,
  assemblyPerItem: 15_000,
  promos: { FORMA10: 0.1 } as Record<string, number>,
};

export type DeliveryOption = "standard" | "express";

/** Validate a promo code: returns the normalised code or null. */
export function checkPromo(code: string) {
  const c = code.trim().toUpperCase();
  return c in PRICING.promos ? c : null;
}

export function totals(items: CartItem[], opts: { assembly: boolean; promo: string | null; delivery?: DeliveryOption }) {
  const units = items.reduce((n, i) => n + i.qty, 0);
  const subtotal = items.reduce((n, i) => n + i.price * i.qty, 0);
  const free = subtotal >= PRICING.freeDeliveryFrom;
  const standard = units === 0 || free ? 0 : PRICING.delivery;
  const delivery = standard + (opts.delivery === "express" && units > 0 ? PRICING.expressSurcharge : 0);
  const assembly = opts.assembly ? units * PRICING.assemblyPerItem : 0;
  const rate = opts.promo ? (PRICING.promos[opts.promo] ?? 0) : 0;
  const discount = Math.round(subtotal * rate);
  return {
    units,
    subtotal,
    standardDelivery: standard,
    delivery,
    assembly,
    discount,
    total: subtotal + delivery + assembly - discount,
    /** 0–1: how close the subtotal is to free delivery. */
    freeProgress: Math.min(1, subtotal / PRICING.freeDeliveryFrom),
    toFree: Math.max(0, PRICING.freeDeliveryFrom - subtotal),
  };
}
