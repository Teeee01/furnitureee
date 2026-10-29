import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Suspense, useMemo, useState } from "react";
import { Link, Navigate } from "react-router";
import { Line, Money, TotalLine } from "../cart/SummaryLines";
import { Thumb } from "../cart/Thumb";
import { formatDate } from "../checkout/form";
import { lastOrder } from "../checkout/order";
import { formatPrice, type CategoryId } from "../data/furniture";
import { LazyScene } from "../scene/LazyScene";
import { useStore } from "../state/store";
import { useThemeContext } from "../state/themeContext";
import { deriveSelection, selection } from "../state/useConfigurator";
import { Page } from "../ui/Page";
import { SiteHeader } from "../ui/SiteHeader";

const EASE = [0.45, 0, 0.25, 1] as const;
const TIMELINE = ["Order placed", "Preparing", "Out for delivery", "Delivered"];

/** /order-confirmed — the room returns with the first item, a ring pulses
 *  across the platform, a check draws itself. Survives a refresh (the last
 *  order is in localStorage). */
export function OrderConfirmedPage() {
  const order = useStore(lastOrder);
  const { theme } = useThemeContext();
  const reduced = useReducedMotion() ?? false;
  const [details, setDetails] = useState(false);

  // The first item's exact setup, for the showcase scene.
  const first = order?.items[0];
  const shown = useMemo(() => {
    if (!first) return null;
    const base = selection.get();
    return deriveSelection({
      ...base,
      categoryId: first.categoryId,
      slot: first.slot,
      style: first.style ?? base.style,
      finishes: { ...base.finishes, [first.categoryId]: first.finishId } as Record<CategoryId, string>,
    });
  }, [first]);

  if (!order || !shown || !first) return <Navigate to="/" replace />;

  return (
    <Page className="min-h-svh">
      <div className="mx-auto w-full max-w-[1280px] px-6 py-8 sm:px-10 desk:px-[72px] desk:py-[72px]">
        <SiteHeader />

        <div className="mt-6 grid items-center gap-8 desk:mt-10 desk:grid-cols-[minmax(0,55fr)_minmax(0,45fr)] desk:gap-12">
          <div className="relative h-[42vh] min-h-[280px] desk:h-[64vh]">
            <Suspense fallback={null}>
              <LazyScene
                variant="showcase"
                pulse
                category={shown.category}
                slot={first.slot}
                size={shown.size}
                style={first.style ?? "modern"}
                tabletop={shown.tabletop}
                fabric={shown.fabric}
                reduced={reduced}
                theme={theme}
              />
            </Suspense>
          </div>

          <section aria-labelledby="confirm-heading">
            <svg viewBox="0 0 48 48" className="size-12" fill="none" aria-hidden="true">
              <motion.circle
                cx="24"
                cy="24"
                r="22"
                stroke="var(--success)"
                strokeWidth="2"
                initial={{ pathLength: reduced ? 1 : 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, ease: EASE }}
              />
              <motion.path
                d="M15 24.5 21.5 31 33 18"
                stroke="var(--success)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: reduced ? 1 : 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: reduced ? 0 : 0.3, ease: EASE }}
              />
            </svg>

            <h1 id="confirm-heading" className="mt-5 text-[24px] font-medium leading-[1.2] tracking-[-0.02em] text-fg">
              Your room is on its way
            </h1>
            <dl className="mt-4 grid gap-1.5 text-[13px]">
              <div className="flex gap-2">
                <dt className="text-muted">Order number</dt>
                <dd className="tabular-nums text-fg">{order.id}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted">Estimated delivery</dt>
                <dd className="text-fg">{formatDate(order.delivery.date)}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted">Confirmation sent to</dt>
                <dd className="min-w-0 truncate text-fg">{order.delivery.email}</dd>
              </div>
            </dl>
            <p className="mt-2 text-[11px] text-muted">Demo order: nothing was charged and no email was actually sent.</p>

            <ol className="mt-8 grid gap-0 sm:grid-cols-4" aria-label="Delivery progress">
              {TIMELINE.map((label, i) => {
                const done = i === 0;
                return (
                  <li key={label} className="relative flex items-center gap-3 pb-4 sm:flex-col sm:items-start sm:gap-2 sm:pb-0 sm:pr-3">
                    {/* connector */}
                    {i < TIMELINE.length - 1 && (
                      <span className="absolute left-2 top-5 h-[calc(100%-12px)] w-px bg-line sm:left-5 sm:top-2 sm:h-px sm:w-[calc(100%-12px)]" aria-hidden="true" />
                    )}
                    <span
                      className={
                        done
                          ? "relative grid size-4 shrink-0 place-items-center rounded-full bg-success"
                          : "relative size-4 shrink-0 rounded-full border border-line bg-bg"
                      }
                      aria-hidden="true"
                    >
                      {done && (
                        <svg viewBox="0 0 12 12" className="size-2.5" fill="none">
                          <path d="M2.5 6.2 5 8.5l4.5-5" stroke="var(--bg)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <span className={done ? "text-[12px] text-fg" : "text-[12px] text-muted"}>
                      {label}
                      {done && <span className="sr-only"> (done)</span>}
                    </span>
                  </li>
                );
              })}
            </ol>

            <div className="mt-8 flex flex-col gap-2 sm:flex-row">
              <Link to="/" className="btn-primary inline-flex h-11 items-center justify-center px-6 text-[13px]">
                Continue shopping
              </Link>
              <button
                type="button"
                onClick={() => setDetails((d) => !d)}
                aria-expanded={details}
                className="btn-secondary h-11 px-6 text-[13px]"
              >
                {details ? "Hide order details" : "View order details"}
              </button>
            </div>

            <AnimatePresence initial={false}>
              {details && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: EASE }}
                  className="overflow-hidden"
                >
                  <div className="mt-6 rounded-xl border border-line bg-input p-5">
                    <ul className="flex flex-col gap-3">
                      {order.items.map((i) => (
                        <li key={i.key} className="flex items-center gap-3">
                          <Thumb src={i.thumb} className="size-12" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] text-fg">{i.name}</span>
                            <span className="block text-[12px] text-muted">
                              {i.sizeLabel} · Qty {i.qty}
                            </span>
                          </span>
                          <span className="text-[13px] tabular-nums text-fg">{formatPrice(i.price * i.qty)}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-5 flex flex-col gap-3 border-t border-line pt-5">
                      <Line label="Subtotal">
                        <Money value={order.totals.subtotal} />
                      </Line>
                      <Line label="Delivery">
                        <Money value={order.totals.delivery} free />
                      </Line>
                      {order.totals.assembly > 0 && (
                        <Line label="Assembly">
                          <Money value={order.totals.assembly} />
                        </Line>
                      )}
                      {order.totals.discount > 0 && (
                        <Line label={`Discount (${order.promo})`}>
                          <Money value={order.totals.discount} minus />
                        </Line>
                      )}
                      <Line label="Payment">{order.payment}</Line>
                      <TotalLine value={order.totals.total} />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>
      </div>
    </Page>
  );
}
