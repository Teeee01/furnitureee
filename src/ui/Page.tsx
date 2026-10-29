import { motion, useIsPresent } from "framer-motion";
import { useEffect, type ReactNode } from "react";
import { cn } from "./cn";

/**
 * Route transition: pages crossfade (250 ms) while their content slides
 * 12 px. Every page sits in the same grid cell, so old and new overlap.
 */
export function Page({ children, className }: { children: ReactNode; className?: string }) {
  const isPresent = useIsPresent();
  useEffect(() => {
    if (isPresent) window.scrollTo(0, 0);
  }, [isPresent]);
  return (
    <motion.div
      className={cn("min-w-0", !isPresent && "pointer-events-none", className)}
      style={{ gridArea: "1 / 1" }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25, ease: [0.45, 0, 0.25, 1] }}
    >
      {children}
    </motion.div>
  );
}
