import { AnimatePresence, motion } from "framer-motion";
import { useRef } from "react";

/** A number that rolls up (or down) to its new value. */
export function Counter({ value, className }: { value: number; className?: string }) {
  const prev = useRef(value);
  const dir = value >= prev.current ? 1 : -1;
  prev.current = value;
  return (
    <span className={`relative inline-grid overflow-hidden ${className ?? ""}`}>
      <AnimatePresence initial={false} custom={dir}>
        <motion.span
          key={value}
          custom={dir}
          style={{ gridArea: "1 / 1" }}
          variants={{
            enter: (d: number) => ({ y: `${d * 100}%`, opacity: 0 }),
            center: { y: "0%", opacity: 1 },
            exit: (d: number) => ({ y: `${-d * 100}%`, opacity: 0 }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.3, ease: [0.45, 0, 0.25, 1] }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
