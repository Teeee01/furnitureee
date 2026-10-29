import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { formatPrice } from "../data/furniture";
import { PRICING, type totals } from "../state/pricing";
import { PriceRoll } from "../ui/PriceRoll";

type Totals = ReturnType<typeof totals>;

/** One label / value line of an order summary. */
export function Line({ label, children, muted }: { label: ReactNode; children: ReactNode; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 text-[13px]">
      <span className="text-muted">{label}</span>
      <span className={muted ? "text-muted" : "tabular-nums text-fg"}>{children}</span>
    </div>
  );
}

/** Money that rolls to its new value; "Free" when zero (if allowed). */
export function Money({ value, free, minus }: { value: number; free?: boolean; minus?: boolean }) {
  if (free && value === 0) return <span className="text-success-text">Free</span>;
  return <PriceRoll value={value} duration={0.4} prefix={minus ? "−" : ""} className="tabular-nums" />;
}

/** Thin bar: how close the subtotal is to free delivery. */
export function FreeDeliveryBar({ t }: { t: Totals }) {
  return (
    <div className="mt-2">
      <div className="h-1 overflow-hidden rounded-full bg-line">
        <motion.div
          className="h-full rounded-full bg-success"
          initial={false}
          animate={{ width: `${t.freeProgress * 100}%` }}
          transition={{ duration: 0.4, ease: [0.45, 0, 0.25, 1] }}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-muted">
        {t.toFree > 0
          ? `${formatPrice(t.toFree)} away from free delivery (over ${formatPrice(PRICING.freeDeliveryFrom)})`
          : "Free delivery unlocked"}
      </p>
    </div>
  );
}

/** Total line, larger. */
export function TotalLine({ value }: { value: number }) {
  return (
    <div className="flex items-baseline justify-between border-t border-line pt-4">
      <span className="text-[13px] text-fg">Total</span>
      <PriceRoll value={value} duration={0.4} className="text-[24px] font-medium tabular-nums tracking-[-0.02em] text-fg" />
    </div>
  );
}
