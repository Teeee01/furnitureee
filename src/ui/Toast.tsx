import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";

/** A small toast at the bottom of the screen. */
export function Toast({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center px-4 desk:bottom-8" role="status" aria-live="polite">
      <AnimatePresence>
        {open && (
          <motion.div
            className="pointer-events-auto flex items-center gap-3 rounded-full border border-line bg-btn py-1 pl-4 pr-1 text-[13px] text-fg shadow-[0_8px_24px_rgb(0_0_0/0.18)]"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2, ease: [0.45, 0, 0.25, 1] }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
