import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { useEffect } from "react";
import { formatPrice } from "../data/furniture";

/** The price counts up / down to a new value (500 ms number roll). A new
 *  value mid-roll continues from the number currently shown. */
export function PriceRoll({ value, className }: { value: number; className?: string }) {
  const mv = useMotionValue(value);
  const shown = useTransform(mv, (v) => formatPrice(Math.round(v)));
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] });
    return () => controls.stop();
  }, [mv, value, reduced]);
  return (
    <span className={className}>
      <span className="sr-only" aria-live="polite">
        {formatPrice(value)}
      </span>
      <motion.span aria-hidden="true">{shown}</motion.span>
    </span>
  );
}
