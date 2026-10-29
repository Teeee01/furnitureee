import type { DeliveryOption } from "../state/pricing";
import { createStore, readJSON, removeKey, writeJSON } from "../state/store";
import { isNigerianMobile } from "./nigeria";

/*
 * Checkout form progress, kept in sessionStorage so a refresh doesn't wipe
 * it. Card details are NOT part of this: they live in memory only.
 */

export type PaymentMethod = "card" | "transfer" | "pod";

export interface DeliveryForm {
  name: string;
  email: string;
  phone: string;
  street: string;
  area: string;
  city: string;
  state: string;
  note: string;
  option: DeliveryOption;
  /** yyyy-mm-dd */
  date: string;
}

export interface CheckoutProgress {
  /** 0 Delivery · 1 Payment · 2 Review */
  step: number;
  done: number[];
  delivery: DeliveryForm;
  method: PaymentMethod;
  /** The order number, picked once per checkout (also the transfer reference). */
  orderId: string;
}

const KEY = "forma-checkout";

function newOrderId() {
  return `FRM-${Math.floor(10000 + Math.random() * 90000)}`;
}

export const EMPTY_DELIVERY: DeliveryForm = {
  name: "",
  email: "",
  phone: "",
  street: "",
  area: "",
  city: "",
  state: "",
  note: "",
  option: "standard",
  date: "",
};

function initial(): CheckoutProgress {
  const saved = readJSON<CheckoutProgress>("session", KEY);
  return {
    step: 0,
    done: [],
    method: "card",
    ...saved,
    delivery: { ...EMPTY_DELIVERY, ...saved?.delivery },
    orderId: saved?.orderId ?? newOrderId(),
  };
}

export const checkout = createStore<CheckoutProgress>(initial());
checkout.subscribe(() => writeJSON("session", KEY, checkout.get()));

export function resetCheckout() {
  removeKey("session", KEY);
  checkout.set({ step: 0, done: [], method: "card", delivery: { ...EMPTY_DELIVERY }, orderId: newOrderId() });
}

/** Card summary for the review step (brand + last 4), in memory only. */
export const cardSummary = createStore<{ brand: string; last4: string } | null>(null);

/* ─── Dates ─── */

export const LEAD_DAYS: Record<DeliveryOption, number> = { standard: 5, express: 2 };

export function isoDate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function earliestDate(option: DeliveryOption, now = new Date()) {
  const d = new Date(now);
  d.setDate(d.getDate() + LEAD_DAYS[option]);
  return isoDate(d);
}

export function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long" });
}

/* ─── Validation ─── */

export type DeliveryErrors = Partial<Record<keyof DeliveryForm, string>>;

export function validateDelivery(f: DeliveryForm): DeliveryErrors {
  const e: DeliveryErrors = {};
  if (f.name.trim().length < 2) e.name = "Enter your full name";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) e.email = "Enter a valid email address";
  if (!isNigerianMobile(f.phone)) e.phone = "Enter a Nigerian mobile number, e.g. 803 123 4567";
  if (f.street.trim().length < 3) e.street = "Enter your street address";
  if (!f.area.trim()) e.area = "Enter your area";
  if (!f.city.trim()) e.city = "Enter your city";
  if (!f.state) e.state = "Choose your state";
  if (!f.date) e.date = "Choose a delivery date";
  else if (f.date < earliestDate(f.option)) e.date = `The earliest date for ${f.option} delivery is ${formatDate(earliestDate(f.option))}`;
  return e;
}
