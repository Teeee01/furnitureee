import { COUCH_STYLES, dimensionsOf, type CategoryId, type CouchStyle } from "../data/furniture";
import { deriveSelection, type Selection } from "./useConfigurator";
import { createStore, readJSON, useStore, writeJSON } from "./store";

/*
 * The cart: items, the assembly option and the promo code, kept in
 * localStorage (wrapped in try/catch) so it survives a refresh.
 */

export interface CartItem {
  /** Same setup → same key → quantity goes up instead of a duplicate. */
  key: string;
  categoryId: CategoryId;
  slot: number;
  /** Living room only. */
  style?: CouchStyle;
  finishId: string;
  name: string;
  categoryLabel: string;
  sizeLabel: string;
  styleLabel?: string;
  finishLabel: string;
  dimensions: string;
  seats: number;
  /** Unit price in naira. */
  price: number;
  qty: number;
  /** Scene snapshot (data URL) captured when it was added. */
  thumb?: string;
}

export interface CartState {
  items: CartItem[];
  assembly: boolean;
  /** Applied promo code (validated), or null. */
  promo: string | null;
  /** The number on the "View cart" badge: catches up when a flying
   *  snapshot lands (so the count rolls as it arrives). */
  badge: number;
  /** Bumps when the badge should bounce. */
  bump: number;
}

const KEY = "forma-cart";

const saved = readJSON<Pick<CartState, "items" | "assembly" | "promo">>("local", KEY);
const initialItems = Array.isArray(saved?.items) ? saved!.items : [];

export const cart = createStore<CartState>({
  items: initialItems,
  assembly: !!saved?.assembly,
  promo: saved?.promo ?? null,
  badge: count(initialItems),
  bump: 0,
});

cart.subscribe(() => {
  const { items, assembly, promo } = cart.get();
  // Snapshots are the heavy part: if storage is full, keep the cart without them.
  if (!writeJSON("local", KEY, { items, assembly, promo })) {
    writeJSON("local", KEY, { items: items.map((i) => ({ ...i, thumb: undefined })), assembly, promo });
  }
});

export function count(items: CartItem[]) {
  return items.reduce((n, i) => n + i.qty, 0);
}

export function useCart() {
  return useStore(cart);
}

/** A cart item for a configurator selection. */
export function itemFromSelection(s: Selection, thumb?: string): CartItem {
  const { category, size, finish } = deriveSelection(s);
  const living = category.id === "living";
  const style = living ? s.style : undefined;
  return {
    key: [category.id, s.slot, finish.id, style ?? ""].join("|"),
    categoryId: category.id,
    slot: s.slot,
    style,
    finishId: finish.id,
    name: size.name,
    categoryLabel: category.label,
    sizeLabel: size.label,
    styleLabel: style ? COUCH_STYLES.find((x) => x.id === style)?.label : undefined,
    finishLabel: finish.label,
    dimensions: dimensionsOf(size),
    seats: size.seats,
    price: size.price,
    qty: 1,
    thumb,
  };
}

/** Add one; an identical setup increases its quantity. */
export function addToCart(item: CartItem, { deferBadge = false } = {}) {
  cart.set((c) => {
    const existing = c.items.find((i) => i.key === item.key);
    const items = existing
      ? c.items.map((i) => (i.key === item.key ? { ...i, qty: i.qty + 1, thumb: item.thumb ?? i.thumb } : i))
      : [...c.items, item];
    return { ...c, items, badge: deferBadge ? c.badge : count(items), bump: deferBadge ? c.bump : c.bump + 1 };
  });
}

/** The flying snapshot landed: the badge catches up and bounces. */
export function landBadge() {
  cart.set((c) => ({ ...c, badge: count(c.items), bump: c.bump + 1 }));
}

export function setQty(key: string, qty: number) {
  cart.set((c) => {
    const items = c.items.map((i) => (i.key === key ? { ...i, qty: Math.max(1, Math.min(99, qty)) } : i));
    return { ...c, items, badge: count(items) };
  });
}

/** Remove a row; returns what Undo needs. */
export function removeFromCart(key: string) {
  const c = cart.get();
  const index = c.items.findIndex((i) => i.key === key);
  const item = c.items[index];
  if (!item) return null;
  const items = c.items.filter((i) => i.key !== key);
  cart.set({ ...c, items, badge: count(items) });
  return { item, index };
}

export function restoreToCart(item: CartItem, index: number) {
  cart.set((c) => {
    if (c.items.some((i) => i.key === item.key)) return c;
    const items = [...c.items];
    items.splice(Math.min(index, items.length), 0, item);
    return { ...c, items, badge: count(items) };
  });
}

export function setAssembly(assembly: boolean) {
  cart.set((c) => ({ ...c, assembly }));
}

export function setPromo(promo: string | null) {
  cart.set((c) => ({ ...c, promo }));
}

export function clearCart() {
  cart.set((c) => ({ ...c, items: [], promo: null, assembly: false, badge: 0 }));
}
