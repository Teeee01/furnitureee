import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { FreeDeliveryBar, Line, Money, TotalLine } from "../cart/SummaryLines";
import { Thumb } from "../cart/Thumb";
import { formatPrice, type CategoryId } from "../data/furniture";
import { LazyScene } from "../scene/LazyScene";
import {
  removeFromCart,
  restoreToCart,
  setAssembly,
  setPromo,
  setQty,
  useCart,
  type CartItem,
} from "../state/cart";
import { checkPromo, PRICING, totals } from "../state/pricing";
import { useThemeContext } from "../state/themeContext";
import { deriveSelection, selection } from "../state/useConfigurator";
import { Counter } from "../ui/Counter";
import { Page } from "../ui/Page";
import { PriceRoll } from "../ui/PriceRoll";
import { SiteHeader } from "../ui/SiteHeader";
import { Switch } from "../ui/Switch";
import { Toast } from "../ui/Toast";

const EASE = [0.45, 0, 0.25, 1] as const;

export function CartPage() {
  const cart = useCart();
  const navigate = useNavigate();
  const t = totals(cart.items, cart);
  const reduced = useReducedMotion() ?? false;

  // Undo for the last removal (5 s).
  const [undo, setUndo] = useState<{ item: CartItem; index: number } | null>(null);
  const [restored, setRestored] = useState<string | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(undoTimer.current), []);

  const remove = (key: string) => {
    const removed = removeFromCart(key);
    if (!removed) return;
    setUndo(removed);
    clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndo(null), 5000);
  };
  const undoRemove = () => {
    if (!undo) return;
    setRestored(undo.item.key);
    restoreToCart(undo.item, undo.index);
    setUndo(null);
    clearTimeout(undoTimer.current);
  };

  const edit = (item: CartItem) => {
    selection.set((s) => ({
      ...s,
      categoryId: item.categoryId,
      slot: item.slot,
      style: item.style ?? s.style,
      finishes: { ...s.finishes, [item.categoryId]: item.finishId } as Record<CategoryId, string>,
    }));
    navigate("/");
  };

  const empty = cart.items.length === 0;

  return (
    <Page className="min-h-svh">
      <div className="mx-auto w-full max-w-[1280px] px-6 py-8 pb-28 sm:px-10 desk:px-[72px] desk:py-[72px] desk:pb-[72px]">
        <SiteHeader>
          <Link to="/" className="-my-2 py-3 text-[12px] text-muted transition-colors hover:text-fg">
            Continue shopping
          </Link>
        </SiteHeader>

        {empty ? (
          <EmptyCart />
        ) : (
          <div className="mt-10 grid gap-10 desk:mt-14 desk:grid-cols-[minmax(0,62fr)_minmax(0,38fr)] desk:gap-12">
            <section aria-labelledby="cart-heading">
              <div className="flex items-baseline gap-3">
                <h1 id="cart-heading" className="text-[24px] font-medium leading-[1.2] tracking-[-0.02em] text-fg">
                  Your cart
                </h1>
                <span className="text-[13px] text-muted">
                  <Counter value={t.units} /> {t.units === 1 ? "item" : "items"}
                </span>
              </div>

              <ul className="mt-6 border-t border-line">
                <AnimatePresence initial={true}>
                  {cart.items.map((item, i) => (
                    <CartRow
                      key={item.key}
                      item={item}
                      index={i}
                      restored={restored === item.key}
                      reduced={reduced}
                      onEdit={() => edit(item)}
                      onRemove={() => remove(item.key)}
                    />
                  ))}
                </AnimatePresence>
              </ul>
            </section>

            <aside aria-label="Order summary" className="desk:sticky desk:top-8 desk:self-start">
              <OrderSummary t={t} assembly={cart.assembly} promo={cart.promo} onCheckout={() => navigate("/checkout")} />
            </aside>
          </div>
        )}
      </div>

      {/* Mobile: Total + Checkout always at hand */}
      {!empty && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-4 border-t border-line bg-bg px-6 py-3 desk:hidden">
          <div>
            <p className="text-[11px] text-muted">Total</p>
            <PriceRoll value={t.total} duration={0.4} className="text-[17px] font-medium tabular-nums text-fg" />
          </div>
          <button type="button" onClick={() => navigate("/checkout")} className="btn-primary h-11 px-6 text-[13px]">
            Checkout
          </button>
        </div>
      )}

      <Toast open={!!undo}>
        <span>Removed</span>
        <span className="text-muted" aria-hidden="true">
          ·
        </span>
        <button type="button" onClick={undoRemove} className="h-8 rounded-full px-3 font-medium text-fg underline-offset-2 hover:underline">
          Undo
        </button>
      </Toast>
    </Page>
  );
}

/**
 * One cart line. Page load: rows rise 8 px and fade in, 40 ms apart.
 * Remove: fade + slide 16 px left, then the height collapses (300 ms total)
 * so the rows below glide up. Undo plays it backwards.
 */
function CartRow({
  item,
  index,
  restored,
  reduced,
  onEdit,
  onRemove,
}: {
  item: CartItem;
  index: number;
  restored: boolean;
  reduced: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const detail = [item.categoryLabel, item.sizeLabel, item.styleLabel, item.finishLabel].filter(Boolean).join(" · ");
  const half = reduced ? 0 : 0.15;
  return (
    <motion.li
      className="overflow-hidden"
      initial={restored ? { opacity: 0, x: -16, height: 0 } : { opacity: 0, y: 8 }}
      animate={{
        opacity: 1,
        x: 0,
        y: 0,
        height: "auto",
        transition: restored
          ? { height: { duration: half, ease: EASE }, default: { duration: 0.15, delay: half, ease: EASE } }
          : { duration: 0.3, delay: index * 0.04, ease: EASE },
      }}
      exit={{
        opacity: 0,
        x: -16,
        height: 0,
        transition: { default: { duration: 0.15, ease: EASE }, height: { duration: half, delay: half, ease: EASE } },
      }}
    >
      <div className="flex gap-4 border-b border-line py-5 desk:gap-5">
        <Thumb src={item.thumb} className="size-[72px] desk:size-24" />
        <div className="flex min-w-0 flex-1 flex-col gap-3 desk:flex-row desk:items-start desk:justify-between">
          <div className="min-w-0">
            <p className="text-[14px] font-medium text-fg">{item.name}</p>
            <p className="mt-1 text-[12px] text-muted">{detail}</p>
            <p className="mt-0.5 text-[12px] text-muted">
              {item.dimensions} · Seats {item.seats}
            </p>
            <div className="mt-2 flex gap-4 text-[12px]">
              <button type="button" onClick={onEdit} className="-my-[11px] py-[11px] text-fg underline-offset-2 hover:underline">
                Edit
              </button>
              <button type="button" onClick={onRemove} className="-my-[11px] py-[11px] text-muted underline-offset-2 hover:text-fg hover:underline">
                Remove
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 desk:flex-col desk:items-end">
            <Stepper item={item} />
            <PriceRoll value={item.price * item.qty} duration={0.4} className="text-[14px] font-medium tabular-nums text-fg" />
          </div>
        </div>
      </div>
    </motion.li>
  );
}

/** − qty + : same buttons as the size row. */
function Stepper({ item }: { item: CartItem }) {
  const btn = "seg-btn size-10 shrink-0 text-[15px] disabled:opacity-40 desk:size-9";
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label={`Quantity of ${item.name}`}>
      <button
        type="button"
        className={btn}
        onClick={() => setQty(item.key, item.qty - 1)}
        disabled={item.qty <= 1}
        aria-label="Decrease quantity"
      >
        −
      </button>
      <span className="grid w-7 place-items-center text-[13px] tabular-nums text-fg" aria-live="polite">
        <Counter value={item.qty} />
      </span>
      <button type="button" className={btn} onClick={() => setQty(item.key, item.qty + 1)} aria-label="Increase quantity">
        +
      </button>
    </div>
  );
}

function OrderSummary({
  t,
  assembly,
  promo,
  onCheckout,
}: {
  t: ReturnType<typeof totals>;
  assembly: boolean;
  promo: string | null;
  onCheckout: () => void;
}) {
  return (
    <div className="rounded-xl border border-line bg-input p-6">
      <h2 className="text-[15px] font-medium text-fg">Order summary</h2>
      <div className="mt-5 flex flex-col gap-3">
        <Line label="Subtotal">
          <Money value={t.subtotal} />
        </Line>
        <div>
          <Line label="Delivery">
            <Money value={t.delivery} free />
          </Line>
          <FreeDeliveryBar t={t} />
        </div>
        <div className="flex items-center justify-between gap-4 text-[13px]">
          <span className="flex items-center gap-2 text-muted">
            <Switch checked={assembly} onChange={setAssembly} label="Add assembly" />
            Assembly
            <span className="text-[11px]">({formatPrice(PRICING.assemblyPerItem)} / item)</span>
          </span>
          <span className="tabular-nums text-fg">
            <Money value={t.assembly} />
          </span>
        </div>
        <AnimatePresence initial={false}>
          {t.discount > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="overflow-hidden"
            >
              <Line label={`Discount (${promo})`}>
                <Money value={t.discount} minus />
              </Line>
            </motion.div>
          )}
        </AnimatePresence>
        <TotalLine value={t.total} />
      </div>

      <PromoForm promo={promo} />

      <button type="button" onClick={onCheckout} className="btn-primary mt-6 h-11 w-full text-[13px]">
        Checkout
      </button>
      <p className="mt-3 text-center text-[11px] text-muted">Free returns within 30 days · 2-year warranty</p>
      <div className="mt-4 text-center">
        <Link to="/" className="inline-block py-[11px] text-[12px] text-fg underline-offset-2 hover:underline">
          Continue shopping
        </Link>
      </div>
    </div>
  );
}

function PromoForm({ promo }: { promo: string | null }) {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const valid = checkPromo(code);
    if (valid) {
      setPromo(valid);
      setMessage({ ok: true, text: `${valid} applied — ${Math.round((PRICING.promos[valid] ?? 0) * 100)}% off` });
      setCode("");
    } else {
      setMessage({ ok: false, text: code.trim() ? "That code isn't valid" : "Enter a promo code" });
    }
  };
  return (
    <form onSubmit={submit} className="mt-6" noValidate>
      <label htmlFor="promo" className="label">
        Promo code
      </label>
      <div className="mt-2.5 flex gap-2">
        <input
          id="promo"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            if (message && !message.ok) setMessage(null);
          }}
          placeholder={promo ? `${promo} is applied` : "Enter code"}
          autoCapitalize="characters"
          autoComplete="off"
          aria-invalid={message ? !message.ok : undefined}
          aria-describedby={message ? "promo-msg" : undefined}
          className="field h-11 flex-1 desk:h-10"
        />
        <button type="submit" className="btn-secondary h-11 px-4 text-[13px] desk:h-10">
          Apply
        </button>
      </div>
      <div aria-live="polite">
        {message && (
          <p id="promo-msg" className={`mt-2 text-[12px] ${message.ok ? "text-success-text" : "text-danger"}`}>
            {message.text}
            {message.ok && promo && (
              <button
                type="button"
                className="ml-2 text-muted underline-offset-2 hover:underline"
                onClick={() => {
                  setPromo(null);
                  setMessage(null);
                }}
              >
                Remove
              </button>
            )}
          </p>
        )}
      </div>
    </form>
  );
}

/** Empty cart: the bare platform (just the plant, idling) and a way back. */
function EmptyCart() {
  const { theme } = useThemeContext();
  const reduced = useReducedMotion() ?? false;
  const d = deriveSelection(selection.get());
  return (
    <div className="mt-6 flex flex-col items-center text-center">
      <div className="relative h-[38vh] min-h-[260px] w-full max-w-[560px]">
        <Suspense fallback={null}>
          <LazyScene
            variant="empty"
            category={d.category}
            slot={0}
            size={d.size}
            style="modern"
            tabletop={d.tabletop}
            fabric={d.fabric}
            reduced={reduced}
            theme={theme}
          />
        </Suspense>
      </div>
      <h1 className="text-[24px] font-medium leading-[1.2] tracking-[-0.02em] text-fg">Your room is waiting</h1>
      <p className="mt-2 text-[13px] text-muted">Your cart is empty. Pick a piece and watch the room fill up.</p>
      <Link to="/" className="btn-primary mt-6 inline-flex h-11 items-center px-6 text-[13px]">
        Start configuring
      </Link>
    </div>
  );
}
