import { AnimatePresence, motion, useIsPresent } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router";
import { CheckoutSummaryBar, CheckoutSummaryCard } from "../checkout/CheckoutSummary";
import { DeliveryStep } from "../checkout/DeliveryStep";
import {
  cardSummary,
  checkout,
  formatDate,
  resetCheckout,
  validateDelivery,
  type DeliveryForm,
  type PaymentMethod,
} from "../checkout/form";
import { lastOrder } from "../checkout/order";
import { METHOD_LABEL, PaymentStep } from "../checkout/PaymentStep";
import { ReviewStep } from "../checkout/ReviewStep";
import { formatPrice } from "../data/furniture";
import { clearCart, useCart } from "../state/cart";
import { totals } from "../state/pricing";
import { useStore } from "../state/store";
import { Page } from "../ui/Page";
import { SiteHeader } from "../ui/SiteHeader";
import { StepIndicator } from "../ui/StepIndicator";
import { Link } from "react-router";

const STEPS = ["delivery", "payment", "review"] as const;
const TITLES = ["Delivery", "Payment", "Review"];
const FORM_ID = "checkout-step";
const EASE = [0.45, 0, 0.25, 1] as const;

/**
 * /checkout — Delivery → Payment → Review. The step is in the URL
 * (?step=…), so the browser's back button steps back too. Progress (not card
 * details) is kept in sessionStorage.
 */
export function CheckoutPage() {
  const cart = useCart();
  const progress = useStore(checkout);
  const card = useStore(cardSummary);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const placed = useRef(false);
  const [placing, setPlacing] = useState(false);
  // While this page fades out (e.g. after placing the order) it must not
  // touch the URL any more.
  const present = useIsPresent();
  const active = present && !placed.current && cart.items.length > 0;

  const t = totals(cart.items, { assembly: cart.assembly, promo: cart.promo, delivery: progress.delivery.option });

  // Which step may be shown: never past the first incomplete one.
  const deliveryOk = Object.keys(validateDelivery(progress.delivery)).length === 0;
  const paymentOk = progress.done.includes(1) && (progress.method !== "card" || !!card);
  const maxStep = !deliveryOk || !progress.done.includes(0) ? 0 : !paymentOk ? 1 : 2;
  const asked = STEPS.indexOf((params.get("step") ?? "") as (typeof STEPS)[number]);
  const step = asked < 0 ? Math.min(progress.step, maxStep) : Math.min(asked, maxStep);

  // Keep the URL in step (replace: no extra history entry).
  useEffect(() => {
    if (!active) return;
    if (params.get("step") !== STEPS[step]) setParams({ step: STEPS[step]! }, { replace: true });
  }, [active, step, params, setParams]);

  // Direction of the step slide: forward slides left, back slides right.
  const prevStep = useRef(step);
  const dir = step >= prevStep.current ? 1 : -1;
  useEffect(() => {
    prevStep.current = step;
    if (active && progress.step !== step) checkout.set((p) => ({ ...p, step }));
  }, [active, step, progress.step]);

  if (cart.items.length === 0 && !placed.current) return <Navigate to="/cart" replace />;

  const go = (s: number) => {
    if (active) setParams({ step: STEPS[s]! });
  };
  const complete = (s: number) => {
    checkout.set((p) => ({ ...p, done: p.done.includes(s) ? p.done : [...p.done, s] }));
    go(s + 1);
  };
  const setDelivery = (patch: Partial<DeliveryForm>) => checkout.set((p) => ({ ...p, delivery: { ...p.delivery, ...patch } }));
  const setMethod = (method: PaymentMethod) => checkout.set((p) => ({ ...p, method }));

  const place = () => {
    if (placing) return;
    setPlacing(true);
    // Simulated: no payment is processed.
    setTimeout(() => {
      placed.current = true;
      lastOrder.set({
        id: progress.orderId,
        placedAt: new Date().toISOString(),
        items: cart.items,
        totals: t,
        promo: cart.promo,
        delivery: progress.delivery,
        payment: progress.method === "card" && card ? `${card.brand} •••• ${card.last4}` : METHOD_LABEL[progress.method],
      });
      navigate("/order-confirmed", { replace: true });
      // After the route has changed: empty the cart and the form.
      setTimeout(() => {
        clearCart();
        resetCheckout();
        cardSummary.set(null);
      }, 0);
    }, 1500);
  };

  const primary = [
    "Continue to payment",
    "Review order",
    `Place order · ${formatPrice(t.total)}`,
  ][step]!;

  const summaries = [
    progress.delivery.name
      ? `${progress.delivery.name} · ${progress.delivery.city || "—"} · ${progress.delivery.option === "express" ? "Express" : "Standard"}${progress.delivery.date ? ` · ${formatDate(progress.delivery.date)}` : ""}`
      : "",
    progress.method === "card" && card ? `${card.brand} •••• ${card.last4}` : METHOD_LABEL[progress.method],
  ];

  return (
    <Page className="min-h-svh">
      <div className="mx-auto w-full max-w-[1280px] px-6 py-8 pb-28 sm:px-10 desk:px-[72px] desk:py-[72px] desk:pb-[72px]">
        <SiteHeader>
          <Link to="/cart" className="-my-2 py-3 text-[12px] text-muted transition-colors hover:text-fg">
            Back to cart
          </Link>
        </SiteHeader>

        <div className="mt-8 desk:hidden">
          <CheckoutSummaryBar items={cart.items} t={t} promo={cart.promo} />
        </div>

        <div className="mt-8 grid gap-10 desk:mt-14 desk:grid-cols-[minmax(0,62fr)_minmax(0,38fr)] desk:gap-12">
          <section aria-labelledby="checkout-heading" className="min-w-0">
            <StepIndicator total={3} current={step} done={progress.done} />
            <p className="mt-3 text-[12px] text-muted">
              {TITLES.map((title, i) => (
                <span key={title} className={i === step ? "text-fg" : undefined}>
                  {i > 0 && " · "}
                  {i + 1} {title}
                </span>
              ))}
            </p>
            <h1 id="checkout-heading" className="sr-only">
              Checkout
            </h1>

            {/* Completed steps collapse into one-line rows. */}
            <div className="mt-6 flex flex-col gap-2">
              <AnimatePresence initial={false}>
                {[0, 1].map(
                  (s) =>
                    s < step && (
                      <motion.div
                        key={s}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: EASE }}
                        className="overflow-hidden"
                      >
                        <div className="flex items-center gap-3 rounded-xl border border-line bg-input px-4 py-3 text-[13px]">
                          <span className="grid size-4 shrink-0 place-items-center rounded-full bg-success" aria-hidden="true">
                            <svg viewBox="0 0 12 12" className="size-2.5" fill="none">
                              <path d="M2.5 6.2 5 8.5l4.5-5" stroke="var(--bg)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </span>
                          <span className="shrink-0 text-fg">{TITLES[s]}</span>
                          <span className="min-w-0 flex-1 truncate text-muted">{summaries[s]}</span>
                          <button type="button" onClick={() => go(s)} className="-my-[11px] shrink-0 py-[11px] text-[12px] text-fg underline-offset-2 hover:underline">
                            Edit
                          </button>
                        </div>
                      </motion.div>
                    ),
                )}
              </AnimatePresence>
            </div>

            <h2 className="mt-8 text-[24px] font-medium leading-[1.2] tracking-[-0.02em] text-fg">{TITLES[step]}</h2>

            {/* The current step slides 24 px and fades (300 ms); back reverses it. */}
            <div className="relative mt-6">
              <AnimatePresence initial={false} mode="popLayout" custom={dir}>
                <motion.div
                  key={step}
                  custom={dir}
                  variants={{
                    enter: (d: number) => ({ opacity: 0, x: 24 * d }),
                    center: { opacity: 1, x: 0 },
                    exit: (d: number) => ({ opacity: 0, x: -24 * d }),
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: EASE }}
                >
                  {step === 0 && (
                    <DeliveryStep
                      formId={FORM_ID}
                      value={progress.delivery}
                      onChange={setDelivery}
                      onDone={() => complete(0)}
                      standardDelivery={t.standardDelivery}
                    />
                  )}
                  {step === 1 && (
                    <PaymentStep
                      formId={FORM_ID}
                      method={progress.method}
                      onMethod={setMethod}
                      onDone={() => complete(1)}
                      orderId={progress.orderId}
                      total={formatPrice(t.total)}
                    />
                  )}
                  {step === 2 && (
                    <ReviewStep
                      formId={FORM_ID}
                      delivery={progress.delivery}
                      method={progress.method}
                      card={card}
                      items={cart.items}
                      onEdit={go}
                      onPlace={place}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="mt-8 hidden desk:block">
              <PrimaryButton label={primary} placing={placing} />
            </div>
          </section>

          <aside aria-label="Order summary" className="hidden desk:sticky desk:top-8 desk:block desk:self-start">
            <CheckoutSummaryCard items={cart.items} t={t} promo={cart.promo} />
          </aside>
        </div>
      </div>

      {/* Mobile: the step's main button stays at hand. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg px-6 py-3 desk:hidden">
        <PrimaryButton label={primary} placing={placing} />
      </div>
    </Page>
  );
}

/** Submits the current step's form; a spinner while the order is placed. */
function PrimaryButton({ label, placing }: { label: string; placing: boolean }) {
  return (
    <button
      type="submit"
      form={FORM_ID}
      disabled={placing}
      aria-busy={placing}
      className="btn-primary flex h-11 w-full items-center justify-center gap-2 text-[13px] disabled:cursor-wait desk:w-auto desk:min-w-[240px] desk:px-6"
    >
      {placing ? (
        <>
          <motion.span
            className="size-4 rounded-full border-2 border-white/40 border-t-white"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
            aria-hidden="true"
          />
          Placing order…
        </>
      ) : (
        label
      )}
    </button>
  );
}
