import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Link } from "react-router";
import { Line, Money, TotalLine } from "../cart/SummaryLines";
import { Thumb } from "../cart/Thumb";
import type { CartItem } from "../state/cart";
import type { totals } from "../state/pricing";
import { PriceRoll } from "../ui/PriceRoll";

type Totals = ReturnType<typeof totals>;

/** Items (48 px thumbnails) + the money lines. */
export function SummaryBody({ items, t, promo }: { items: CartItem[]; t: Totals; promo: string | null }) {
  return (
    <>
      <ul className="flex flex-col gap-3">
        {items.map((i) => (
          <li key={i.key} className="flex items-center gap-3">
            <span className="relative">
              <Thumb src={i.thumb} className="size-12" />
              <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full border border-line bg-btn px-1 text-[11px] tabular-nums text-fg">
                {i.qty}
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] text-fg">{i.name}</span>
              <span className="block text-[12px] text-muted">
                {i.sizeLabel} · Qty {i.qty}
              </span>
            </span>
            <span className="text-[13px] tabular-nums text-fg">
              <Money value={i.price * i.qty} />
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex flex-col gap-3 border-t border-line pt-5">
        <Line label="Subtotal">
          <Money value={t.subtotal} />
        </Line>
        <Line label="Delivery">
          <Money value={t.delivery} free />
        </Line>
        <Line label="Assembly">{t.assembly ? <Money value={t.assembly} /> : <span className="text-muted">Not added</span>}</Line>
        {t.discount > 0 && (
          <Line label={`Discount (${promo})`}>
            <Money value={t.discount} minus />
          </Line>
        )}
        <TotalLine value={t.total} />
      </div>
    </>
  );
}

/** Desktop: the sticky summary card. */
export function CheckoutSummaryCard(props: { items: CartItem[]; t: Totals; promo: string | null }) {
  return (
    <div className="rounded-xl border border-line bg-input p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-[15px] font-medium text-fg">Order summary</h2>
        <Link to="/cart" className="-my-[11px] py-[11px] text-[12px] text-muted underline-offset-2 hover:text-fg hover:underline">
          Edit cart
        </Link>
      </div>
      <SummaryBody {...props} />
    </div>
  );
}

/** Mobile: "Show order summary · ₦total" bar that expands. */
export function CheckoutSummaryBar(props: { items: CartItem[]; t: Totals; promo: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-line bg-input desk:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex h-12 w-full items-center justify-between gap-3 px-4 text-[13px] text-fg"
      >
        <span className="flex items-center gap-2">
          <motion.svg viewBox="0 0 12 12" className="size-3 text-muted" fill="none" animate={{ rotate: open ? 180 : 0 }} aria-hidden="true">
            <path d="M3 4.5 6 7.5 9 4.5" stroke="currentColor" strokeWidth="1.5" />
          </motion.svg>
          {open ? "Hide" : "Show"} order summary
        </span>
        <PriceRoll value={props.t.total} duration={0.4} className="font-medium tabular-nums" />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.45, 0, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-line p-4">
              <SummaryBody {...props} />
              <Link to="/cart" className="mt-4 inline-block py-2 text-[12px] text-muted underline-offset-2 hover:text-fg hover:underline">
                Edit cart
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
