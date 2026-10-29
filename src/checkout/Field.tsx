import { AnimatePresence, motion } from "framer-motion";
import { useId, type ReactNode } from "react";
import { cn } from "../ui/cn";

/** Label + control + inline error (red text under the field, tied to the
 *  control with aria-describedby). */
export function Field({
  label,
  error,
  hint,
  optional,
  className,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  className?: string;
  children: (props: { id: string; "aria-invalid": boolean; "aria-describedby"?: string }) => ReactNode;
}) {
  const id = useId();
  const msgId = `${id}-msg`;
  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className="mb-2 block text-[12px] text-muted">
        {label}
        {optional && <span className="ml-1 text-[11px]">(optional)</span>}
      </label>
      {children({ id, "aria-invalid": !!error, "aria-describedby": error || hint ? msgId : undefined })}
      <AnimatePresence initial={false} mode="wait">
        {error ? (
          <motion.p
            key="e"
            id={msgId}
            className="mt-1.5 text-[12px] text-danger"
            initial={{ opacity: 0, y: -2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {error}
          </motion.p>
        ) : hint ? (
          <p key="h" id={msgId} className="mt-1.5 text-[11px] text-muted">
            {hint}
          </p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
