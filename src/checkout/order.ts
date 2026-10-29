import type { CartItem } from "../state/cart";
import type { totals } from "../state/pricing";
import { createStore, readJSON, writeJSON } from "../state/store";
import type { DeliveryForm } from "./form";

/** The last order placed (demo), kept in localStorage so a refresh keeps
 *  the confirmation page. */
export interface Order {
  id: string;
  placedAt: string;
  items: CartItem[];
  totals: ReturnType<typeof totals>;
  promo: string | null;
  delivery: DeliveryForm;
  payment: string;
}

const KEY = "forma-last-order";

export const lastOrder = createStore<Order | null>(readJSON<Order>("local", KEY));
lastOrder.subscribe(() => writeJSON("local", KEY, lastOrder.get()));
