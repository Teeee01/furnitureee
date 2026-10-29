import { motion, useAnimationControls } from "framer-motion";
import { useEffect, useRef } from "react";
import { Link } from "react-router";
import { useCart } from "../state/cart";
import { Counter } from "../ui/Counter";
import { cn } from "../ui/cn";
import { cartTarget } from "./flight";

/** "View cart" pill with a count badge (when the cart isn't empty). It
 *  bounces (1 → 1.08 → 1) and the count rolls when a snapshot lands. */
export function ViewCartButton({ className }: { className?: string }) {
  const { badge, bump } = useCart();
  const ref = useRef<HTMLAnchorElement>(null);
  const controls = useAnimationControls();
  const first = useRef(true);

  useEffect(() => {
    cartTarget.el = ref.current;
    return () => {
      if (cartTarget.el === ref.current) cartTarget.el = null;
    };
  }, []);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    controls.start({ scale: [1, 1.08, 1], transition: { duration: 0.35, ease: [0.45, 0, 0.25, 1] } });
  }, [bump, controls]);

  return (
    <motion.span animate={controls} className={cn("inline-flex", className)}>
      <Link
        ref={ref}
        to="/cart"
        className="btn-pill inline-flex h-10 items-center gap-2 px-4 text-[12px] desk:h-8 desk:px-3.5"
        aria-label={badge ? `View cart, ${badge} item${badge === 1 ? "" : "s"}` : "View cart"}
      >
        View cart
        {badge > 0 && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[11px] font-medium tabular-nums text-[var(--on-accent)]">
            <Counter value={badge} />
          </span>
        )}
      </Link>
    </motion.span>
  );
}
