import { motion, useAnimationControls } from "framer-motion";
import { useState, type FormEvent, type ReactNode } from "react";
import { Thumb } from "../cart/Thumb";
import { formatPrice } from "../data/furniture";
import type { CartItem } from "../state/cart";
import { formatDate, type DeliveryForm, type PaymentMethod } from "./form";
import { METHOD_LABEL } from "./PaymentStep";

/** Step 3 — everything at a glance, each block with an Edit link. */
export function ReviewStep({
  formId,
  delivery,
  method,
  card,
  items,
  onEdit,
  onPlace,
}: {
  formId: string;
  delivery: DeliveryForm;
  method: PaymentMethod;
  card: { brand: string; last4: string } | null;
  items: CartItem[];
  onEdit: (step: number) => void;
  onPlace: () => void;
}) {
  const [agreed, setAgreed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const shake = useAnimationControls();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!agreed) {
      shake.start({ x: [0, -4, 4, -4, 4, 0], transition: { duration: 0.35 } });
      document.getElementById(`${formId}-terms`)?.focus();
      return;
    }
    onPlace();
  };

  return (
    <motion.form id={formId} onSubmit={submit} noValidate animate={shake}>
      <div className="grid gap-3">
        <Block title="Delivery details" onEdit={() => onEdit(0)}>
          <p className="text-fg">{delivery.name}</p>
          <p>
            {delivery.email} · +234 {delivery.phone}
          </p>
          <p>
            {[delivery.street, delivery.area, delivery.city, delivery.state].filter(Boolean).join(", ")}
          </p>
          {delivery.note && <p className="italic">“{delivery.note}”</p>}
        </Block>
        <Block title="Delivery" onEdit={() => onEdit(0)}>
          <p className="text-fg">{delivery.option === "express" ? "Express · 2–3 days" : "Standard · 5–7 days"}</p>
          <p>{delivery.date ? formatDate(delivery.date) : "No date chosen"}</p>
        </Block>
        <Block title="Payment" onEdit={() => onEdit(1)}>
          <p className="text-fg">
            {method === "card" && card ? `${card.brand} •••• ${card.last4}` : METHOD_LABEL[method]}
          </p>
          <p>Demo mode — no real charge</p>
        </Block>
      </div>

      <h3 className="label mt-8">Items</h3>
      <ul className="mt-3 border-t border-line">
        {items.map((i) => (
          <li key={i.key} className="flex items-center gap-4 border-b border-line py-4">
            <Thumb src={i.thumb} className="size-16" />
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-medium text-fg">{i.name}</span>
              <span className="block text-[12px] text-muted">
                {[i.categoryLabel, i.sizeLabel, i.styleLabel, i.finishLabel].filter(Boolean).join(" · ")}
              </span>
              <span className="block text-[12px] text-muted">
                {i.dimensions} · Qty {i.qty}
              </span>
            </span>
            <span className="text-[13px] tabular-nums text-fg">{formatPrice(i.price * i.qty)}</span>
          </li>
        ))}
      </ul>

      <label className="mt-6 flex min-h-10 cursor-pointer items-center gap-3 text-[13px] text-fg">
        <input
          id={`${formId}-terms`}
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          aria-invalid={submitted && !agreed}
          aria-describedby={submitted && !agreed ? `${formId}-terms-msg` : undefined}
          className="size-[18px] shrink-0 accent-[var(--accent)]"
        />
        I agree to the terms and return policy
      </label>
      {submitted && !agreed && (
        <p id={`${formId}-terms-msg`} className="mt-1 text-[12px] text-danger">
          Please agree to the terms to place your order
        </p>
      )}
    </motion.form>
  );
}

function Block({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-input p-4 text-[12px] leading-[1.6] text-muted">
      <div className="mb-1 flex items-center justify-between">
        <span className="label">{title}</span>
        <button type="button" onClick={onEdit} className="-my-[11px] py-[11px] text-[12px] text-fg underline-offset-2 hover:underline">
          Edit
        </button>
      </div>
      {children}
    </div>
  );
}
