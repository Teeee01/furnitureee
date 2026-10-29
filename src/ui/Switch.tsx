import { motion } from "framer-motion";
import { cn } from "./cn";

/** On / off switch (role="switch"), 40 px tall tap target. */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="-my-2 grid h-10 place-items-center px-1"
    >
      <span
        className={cn(
          "flex h-5 w-9 items-center rounded-full border p-0.5 transition-colors duration-150",
          checked ? "border-accent bg-accent" : "border-line bg-btn",
        )}
      >
        <motion.span
          className={cn("size-3.5 rounded-full", checked ? "bg-white" : "bg-muted")}
          animate={{ x: checked ? 16 : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 32 }}
        />
      </span>
    </button>
  );
}
