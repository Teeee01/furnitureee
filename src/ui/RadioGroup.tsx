import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "./cn";

export interface RadioOption<T extends string | number> {
  value: T;
  label: ReactNode;
  /** Accessible name when the label isn't text. */
  ariaLabel?: string;
}

/**
 * A row of real <button>s acting as a radiogroup: roving tabindex, arrow keys
 * (and Home / End) move focus and select. The active state is a fade, not a
 * sliding pill. Desktop: equal columns. Mobile (<900 px): one row that
 * scrolls sideways when the labels don't fit, 40 px tall tap targets.
 */
export function SegmentedGroup<T extends string | number>({
  label,
  options,
  value,
  onChange,
  size = "md",
  className,
  columns,
}: {
  label: string;
  options: RadioOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "md" | "lg";
  className?: string;
  /** Desktop grid column classes; defaults to one equal column per option. */
  columns?: string;
}) {
  const { refs, index, onKeyDown } = useRadioKeys(options.map((o) => o.value), value, onChange);

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn("no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-1 desk:mx-0 desk:grid desk:overflow-visible desk:p-0", columns, className)}
      style={columns ? undefined : { gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o, i) => {
        const active = i === index;
        return (
          <button
            key={String(o.value)}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.ariaLabel}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={cn(
              "seg-btn min-w-max flex-1 shrink-0 desk:min-w-0",
              size === "lg" ? "h-11 text-[13px] desk:h-10" : "h-10 text-[12px] desk:h-9",
            )}
            data-active={active || undefined}
          >
            <span className="truncate px-3 desk:px-2">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Roving-tabindex keyboard handling shared by every radiogroup. */
export function useRadioKeys<T>(values: T[], value: T, onChange: (value: T) => void) {
  const refs = useRef<(HTMLElement | null)[]>([]);
  const index = Math.max(0, values.indexOf(value));
  const onKeyDown = (e: KeyboardEvent) => {
    const last = values.length - 1;
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = index === last ? 0 : index + 1;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = index === 0 ? last : index - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    if (next < 0) return;
    e.preventDefault();
    onChange(values[next]!);
    refs.current[next]?.focus();
  };
  return { refs, index, onKeyDown };
}
