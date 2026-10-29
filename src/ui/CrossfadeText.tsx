import { AnimatePresence, motion } from "framer-motion";
import { cn } from "./cn";

/** 250 ms text crossfade: the old text moves up 6 px and fades out, the new
 *  one comes in from 6 px below. Screen readers get the current text once. */
export function CrossfadeText({ text, className }: { text: string; className?: string }) {
  return (
    <span className={cn("grid", className)}>
      <span className="sr-only">{text}</span>
      <AnimatePresence initial={false}>
        <motion.span
          key={text}
          aria-hidden="true"
          style={{ gridArea: "1 / 1" }}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        >
          {text}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
