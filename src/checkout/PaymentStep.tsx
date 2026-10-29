import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createStore, useStore } from "../state/store";
import { cardBrand, formatCardNumber, formatExpiry, validCardNumber, validCvc, validExpiry, type CardBrand } from "./card";
import { OptionCards } from "./DeliveryStep";
import { Field } from "./Field";
import { cardSummary, type PaymentMethod } from "./form";

/*
 * Step 2 — PAYMENT, DEMO ONLY. Nothing is charged, and card details are only
 * formatted and validated: they live in this module's memory, are never
 * saved (not even to sessionStorage) and never sent anywhere. The review step
 * only gets the brand and last 4 digits.
 */

interface CardDraft {
  number: string;
  expiry: string;
  cvc: string;
  name: string;
}
const cardDraft = createStore<CardDraft>({ number: "", expiry: "", cvc: "", name: "" });

export const BANK = {
  bank: "Demo Bank (sample)",
  accountName: "Forma Furniture Ltd",
  accountNumber: "0123456789",
};

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  card: "Card",
  transfer: "Bank transfer",
  pod: "Pay on delivery",
};

type CardKey = keyof CardDraft;

export function PaymentStep({
  formId,
  method,
  onMethod,
  onDone,
  orderId,
  total,
}: {
  formId: string;
  method: PaymentMethod;
  onMethod: (m: PaymentMethod) => void;
  onDone: () => void;
  orderId: string;
  total: string;
}) {
  const card = useStore(cardDraft);
  const [touched, setTouched] = useState<Partial<Record<CardKey, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const shake = useAnimationControls();
  const digits = card.number.replace(/\D/g, "");
  const brand = cardBrand(digits);

  const errors: Partial<Record<CardKey, string>> = {};
  if (method === "card") {
    if (!validCardNumber(card.number)) errors.number = "Enter a valid card number";
    if (!validExpiry(card.expiry)) errors.expiry = card.expiry.length === 5 ? "This card has expired" : "Enter the expiry as MM/YY";
    if (!validCvc(card.cvc, brand)) errors.cvc = brand === "amex" ? "Enter the 4-digit code" : "Enter the 3-digit code";
    if (card.name.trim().length < 2) errors.name = "Enter the name on the card";
  }
  const err = (k: CardKey) => (touched[k] || submitted ? errors[k] : undefined);
  const blur = (k: CardKey) => () => setTouched((t) => ({ ...t, [k]: true }));
  const set = (patch: Partial<CardDraft>) => cardDraft.set((c) => ({ ...c, ...patch }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const first = Object.keys(errors)[0];
    if (first) {
      shake.start({ x: [0, -4, 4, -4, 4, 0], transition: { duration: 0.35 } });
      document.querySelector<HTMLElement>(`#${formId} [name="card-${first}"]`)?.focus();
      return;
    }
    cardSummary.set(method === "card" ? { brand: brandLabel(brand), last4: digits.slice(-4) } : null);
    onDone();
  };

  return (
    <motion.form id={formId} onSubmit={submit} noValidate animate={shake} autoComplete="off">
      <span className="inline-flex h-6 items-center rounded-full border border-line px-2.5 text-[11px] text-muted">
        Demo mode — no real charge
      </span>

      <OptionCards<PaymentMethod>
        label="Payment method"
        value={method}
        onChange={onMethod}
        options={[
          { id: "card", title: "Card", detail: "Visa, Mastercard, Verve", icon: <MethodIcon kind="card" /> },
          { id: "transfer", title: "Bank transfer", detail: "Pay to our account", icon: <MethodIcon kind="transfer" /> },
          { id: "pod", title: "Pay on delivery", detail: "Card or transfer at the door", icon: <MethodIcon kind="pod" /> },
        ]}
      />

      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={method}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.45, 0, 0.25, 1] }}
          className="overflow-hidden"
        >
          <div className="pt-6">
            {method === "card" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Card number" error={err("number")} className="sm:col-span-2">
                  {(p) => (
                    <div className="relative">
                      <input
                        {...p}
                        name="card-number"
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder="1234 5678 9012 3456"
                        value={card.number}
                        onChange={(e) => set({ number: formatCardNumber(e.target.value) })}
                        onBlur={blur("number")}
                        className="field pr-16 tabular-nums"
                      />
                      <span className="absolute inset-y-0 right-3 flex items-center">
                        <BrandIcon brand={brand} />
                      </span>
                    </div>
                  )}
                </Field>
                <Field label="Expiry (MM/YY)" error={err("expiry")}>
                  {(p) => (
                    <input
                      {...p}
                      name="card-expiry"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="MM/YY"
                      value={card.expiry}
                      onChange={(e) =>
                        set({
                          // Let backspace remove the slash.
                          expiry: e.target.value.length < card.expiry.length ? e.target.value.replace(/\/$/, "") : formatExpiry(e.target.value),
                        })
                      }
                      onBlur={blur("expiry")}
                      className="field tabular-nums"
                    />
                  )}
                </Field>
                <Field label="CVV" error={err("cvc")}>
                  {(p) => (
                    <input
                      {...p}
                      name="card-cvc"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder={brand === "amex" ? "4 digits" : "3 digits"}
                      value={card.cvc}
                      onChange={(e) => set({ cvc: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                      onBlur={blur("cvc")}
                      className="field tabular-nums"
                    />
                  )}
                </Field>
                <Field label="Name on card" error={err("name")} className="sm:col-span-2">
                  {(p) => (
                    <input
                      {...p}
                      name="card-name"
                      autoComplete="off"
                      value={card.name}
                      onChange={(e) => set({ name: e.target.value })}
                      onBlur={blur("name")}
                      className="field"
                    />
                  )}
                </Field>
                <p className="text-[11px] text-muted sm:col-span-2">
                  Demo only: card details are checked for format and never saved or sent.
                </p>
              </div>
            )}

            {method === "transfer" && (
              <div className="rounded-xl border border-line bg-input p-5">
                <p className="text-[13px] text-muted">
                  Transfer <span className="text-fg">{total}</span> to this sample account. Your order is confirmed when the
                  transfer arrives.
                </p>
                <dl className="mt-4 grid gap-3 text-[13px]">
                  <Detail label="Bank" value={BANK.bank} />
                  <Detail label="Account name" value={BANK.accountName} />
                  <Detail label="Account number" value={BANK.accountNumber} copy />
                  <Detail label="Reference" value={orderId} copy />
                </dl>
              </div>
            )}

            {method === "pod" && (
              <div className="rounded-xl border border-line bg-input p-5 text-[13px] text-muted">
                Pay when your furniture arrives, by card or bank transfer to the delivery team. Please have the full amount
                ready: <span className="text-fg">{total}</span>. Our team calls the day before to confirm.
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.form>
  );
}

function brandLabel(b: CardBrand) {
  return b === "visa" ? "Visa" : b === "mastercard" ? "Mastercard" : b === "verve" ? "Verve" : b === "amex" ? "Amex" : "Card";
}

function Detail({ label, value, copy }: { label: string; value: string; copy?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="flex items-center gap-2 text-fg">
        <span className="tabular-nums">{value}</span>
        {copy && <CopyButton text={value} label={label} />}
      </dd>
    </div>
  );
}

/** "Copy" → "Copied ✓" for a moment. */
function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard blocked: still acknowledge (the value is on screen to copy by hand).
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button type="button" onClick={copy} className="btn-secondary h-10 min-w-[84px] px-3 text-[12px] desk:h-8" aria-label={`Copy ${label.toLowerCase()}`}>
      <span aria-live="polite">{copied ? "Copied ✓" : "Copy"}</span>
    </button>
  );
}

function MethodIcon({ kind }: { kind: PaymentMethod }) {
  return (
    <svg viewBox="0 0 20 20" className="size-5 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      {kind === "card" && (
        <>
          <rect x="2.5" y="4.5" width="15" height="11" rx="2" />
          <path d="M2.5 8h15M5.5 12.5h3" />
        </>
      )}
      {kind === "transfer" && <path d="M3 8h12l-3-3M17 12H5l3 3" strokeLinecap="round" strokeLinejoin="round" />}
      {kind === "pod" && (
        <>
          <path d="M2.5 6.5h9v7h-9zM11.5 9h3l2.5 2.5v2h-5.5" strokeLinejoin="round" />
          <circle cx="6" cy="14.5" r="1.3" />
          <circle cx="14" cy="14.5" r="1.3" />
        </>
      )}
    </svg>
  );
}

/** Tiny card-brand badges (drawn, not logos). */
function BrandIcon({ brand }: { brand: CardBrand }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={brand ?? "none"}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.15 }}
        className="grid h-6 w-10 place-items-center rounded border border-line bg-input text-[9px] font-semibold tracking-wide text-fg"
        aria-label={brand ? brandLabel(brand) : undefined}
        role={brand ? "img" : undefined}
      >
        {brand === "mastercard" ? (
          <svg viewBox="0 0 24 14" className="h-3.5" aria-hidden="true">
            <circle cx="9" cy="7" r="6" fill="#EB001B" />
            <circle cx="15" cy="7" r="6" fill="#F79E1B" fillOpacity="0.9" />
          </svg>
        ) : brand === "visa" ? (
          <span className="italic">VISA</span>
        ) : brand === "verve" ? (
          <span>Verve</span>
        ) : brand === "amex" ? (
          <span>AMEX</span>
        ) : (
          <svg viewBox="0 0 20 14" className="h-3 text-muted" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
            <rect x="1" y="1" width="18" height="12" rx="2" />
            <path d="M1 5h18" />
          </svg>
        )}
      </motion.span>
    </AnimatePresence>
  );
}
