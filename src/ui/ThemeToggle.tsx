import { AnimatePresence, motion } from "framer-motion";
import type { ThemeName } from "../theme";

/** Sun / moon button. The icon turns 90° and crossfades as it swaps. */
export function ThemeToggle({ theme, onToggle }: { theme: ThemeName; onToggle: () => void }) {
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className="btn-secondary relative grid size-10 place-items-center overflow-hidden text-fg desk:size-8"
    >
      <AnimatePresence initial={false}>
        <motion.svg
          key={theme}
          viewBox="0 0 20 20"
          className="absolute size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          aria-hidden="true"
          initial={{ rotate: -90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          exit={{ rotate: 90, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.45, 0, 0.25, 1] }}
        >
          {theme === "dark" ? (
            // Moon (dark theme is on)
            <path d="M16 12.2A6.5 6.5 0 0 1 7.8 4a6.5 6.5 0 1 0 8.2 8.2Z" strokeLinejoin="round" />
          ) : (
            // Sun (light theme is on)
            <>
              <circle cx="10" cy="10" r="3.2" />
              <path d="M10 2.5v1.6M10 15.9v1.6M2.5 10h1.6M15.9 10h1.6M4.7 4.7l1.1 1.1M14.2 14.2l1.1 1.1M4.7 15.3l1.1-1.1M14.2 5.8l1.1-1.1" />
            </>
          )}
        </motion.svg>
      </AnimatePresence>
    </button>
  );
}
