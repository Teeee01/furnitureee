import { motion, useAnimationControls } from "framer-motion";
import { useState, type FormEvent } from "react";
import { formatPrice } from "../data/furniture";
import { PRICING, type DeliveryOption } from "../state/pricing";
import { useRadioKeys } from "../ui/RadioGroup";
import { cn } from "../ui/cn";
import { Field } from "./Field";
import { earliestDate, formatDate, validateDelivery, type DeliveryForm } from "./form";
import { formatPhone, NIGERIAN_STATES } from "./nigeria";

type Key = keyof DeliveryForm;

/** Step 1 — contact, address, delivery option and date. Errors show on blur
 *  (never while typing) and on submit, where the form also gives a gentle
 *  4 px shake and focuses the first problem. */
export function DeliveryStep({
  formId,
  value,
  onChange,
  onDone,
  standardDelivery,
}: {
  formId: string;
  value: DeliveryForm;
  onChange: (patch: Partial<DeliveryForm>) => void;
  onDone: () => void;
  /** The cart's delivery price (0 when free). */
  standardDelivery: number;
}) {
  const [touched, setTouched] = useState<Partial<Record<Key, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const shake = useAnimationControls();
  const errors = validateDelivery(value);
  const err = (k: Key) => (touched[k] || submitted ? errors[k] : undefined);
  const blur = (k: Key) => () => setTouched((t) => ({ ...t, [k]: true }));
  const min = earliestDate(value.option);

  const setOption = (option: DeliveryOption) => {
    const earliest = earliestDate(option);
    // Keep the chosen date unless it's now too early.
    onChange({ option, date: value.date && value.date < earliest ? earliest : value.date });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const first = Object.keys(errors)[0];
    if (first) {
      shake.start({ x: [0, -4, 4, -4, 4, 0], transition: { duration: 0.35 } });
      document.querySelector<HTMLElement>(`#${formId} [name="${first}"]`)?.focus();
      return;
    }
    onDone();
  };

  const input = (k: Key, label: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}, className?: string) => (
    <Field label={label} error={err(k)} className={className}>
      {(p) => (
        <input
          {...p}
          name={k}
          value={value[k]}
          onChange={(e) => onChange({ [k]: e.target.value })}
          onBlur={blur(k)}
          className="field"
          {...extra}
        />
      )}
    </Field>
  );

  return (
    <motion.form id={formId} onSubmit={submit} noValidate animate={shake}>
      <fieldset>
        <legend className="label">Contact</legend>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {input("name", "Full name", { autoComplete: "name" }, "sm:col-span-2")}
          {input("email", "Email", { type: "email", inputMode: "email", autoComplete: "email", placeholder: "you@example.com" })}
          <Field label="Phone" error={err("phone")}>
            {(p) => (
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[13px] text-muted">+234</span>
                <input
                  {...p}
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder="803 123 4567"
                  value={value.phone}
                  onChange={(e) => onChange({ phone: e.target.value })}
                  onBlur={(e) => {
                    if (e.target.value.trim()) onChange({ phone: formatPhone(e.target.value) });
                    blur("phone")();
                  }}
                  className="field pl-[52px]"
                />
              </div>
            )}
          </Field>
        </div>
      </fieldset>

      <fieldset className="mt-8">
        <legend className="label">Address</legend>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {input("street", "Street address", { autoComplete: "address-line1" }, "sm:col-span-2")}
          {input("area", "Area", { autoComplete: "address-line2", placeholder: "e.g. Lekki Phase 1" })}
          {input("city", "City", { autoComplete: "address-level2" })}
          <Field label="State" error={err("state")} className="sm:col-span-2">
            {(p) => (
              <select
                {...p}
                name="state"
                value={value.state}
                onChange={(e) => {
                  onChange({ state: e.target.value });
                  setTouched((t) => ({ ...t, state: true }));
                }}
                onBlur={blur("state")}
                autoComplete="address-level1"
                className="field"
              >
                <option value="">Choose a state</option>
                {NIGERIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Delivery note" optional className="sm:col-span-2">
            {(p) => (
              <textarea
                {...p}
                name="note"
                rows={2}
                value={value.note}
                onChange={(e) => onChange({ note: e.target.value })}
                placeholder="Gate code, landmark, best time to call…"
                className="field"
              />
            )}
          </Field>
        </div>
      </fieldset>

      <fieldset className="mt-8">
        <legend className="label">Delivery</legend>
        <OptionCards
          value={value.option}
          onChange={setOption}
          options={[
            {
              id: "standard",
              title: "Standard",
              detail: "5–7 days",
              price: standardDelivery === 0 ? "Free" : formatPrice(standardDelivery),
            },
            { id: "express", title: "Express", detail: "2–3 days", price: `+${formatPrice(PRICING.expressSurcharge)}` },
          ]}
        />
        <Field
          label="Preferred delivery date"
          error={err("date")}
          hint={`Earliest: ${formatDate(min)}`}
          className="mt-4 sm:max-w-[280px]"
        >
          {(p) => (
            <input
              {...p}
              name="date"
              type="date"
              min={min}
              value={value.date}
              onChange={(e) => onChange({ date: e.target.value })}
              onBlur={blur("date")}
              className="field"
            />
          )}
        </Field>
      </fieldset>
    </motion.form>
  );
}

/** Selectable cards with the size buttons' active style (a radiogroup). */
export function OptionCards<T extends string>({
  value,
  onChange,
  options,
  label = "Delivery option",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; title: string; detail?: string; price?: string; icon?: React.ReactNode }[];
  label?: string;
}) {
  const { refs, index, onKeyDown } = useRadioKeys(
    options.map((o) => o.id),
    value,
    onChange,
  );
  return (
    <div role="radiogroup" aria-label={label} onKeyDown={onKeyDown} className={cn("mt-4 grid gap-2", options.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
      {options.map((o, i) => {
        const active = i === index;
        return (
          <button
            key={o.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.id)}
            data-active={active || undefined}
            className="seg-btn flex min-h-14 items-center justify-between gap-3 px-4 py-3 text-left"
          >
            <span className="flex items-center gap-3">
              {o.icon}
              <span>
                <span className="block text-[13px] font-medium text-fg">{o.title}</span>
                {o.detail && <span className="block text-[12px] text-muted">{o.detail}</span>}
              </span>
            </span>
            {o.price && <span className="text-[12px] tabular-nums text-fg">{o.price}</span>}
          </button>
        );
      })}
    </div>
  );
}
