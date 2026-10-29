import { cn } from "./cn";

/** Steps: green check dots for completed steps, a short bar for the current
 *  one, grey dots for those to come. Defaults to the configurator's
 *  "step 2 of 5". */
export function StepIndicator({ total = 5, current = 1, done }: { total?: number; current?: number; done?: number[] }) {
  const isDone = (i: number) => (done ? done.includes(i) && i !== current : i < current);
  return (
    <div className="flex items-center gap-2" aria-label={`Step ${current + 1} of ${total}`} role="img">
      {Array.from({ length: total }, (_, i) =>
        i === current ? (
          <span key={i} className="h-1 w-6 rounded-full bg-fg transition-all duration-300" aria-hidden="true" />
        ) : isDone(i) ? (
          <span key={i} className="grid size-4 place-items-center rounded-full bg-success" aria-hidden="true">
            <svg viewBox="0 0 12 12" className="size-2.5" fill="none">
              <path d="M2.5 6.2 5 8.5l4.5-5" stroke="var(--bg)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        ) : (
          <span key={i} className={cn("size-1.5 rounded-full bg-dot")} aria-hidden="true" />
        ),
      )}
    </div>
  );
}
