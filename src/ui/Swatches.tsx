import type { Finish } from "../data/furniture";
import { cn } from "./cn";
import { useRadioKeys } from "./RadioGroup";

/** Small round finish swatches (a radiogroup). */
export function Swatches({ finishes, value, onChange }: { finishes: Finish[]; value: string; onChange: (id: string) => void }) {
  const { refs, index, onKeyDown } = useRadioKeys(
    finishes.map((f) => f.id),
    value,
    onChange,
  );
  return (
    <div role="radiogroup" aria-label="Finish" onKeyDown={onKeyDown} className="-mr-2.5 flex items-center desk:mr-0 desk:gap-1">
      {finishes.map((f, i) => {
        const active = i === index;
        return (
          <button
            key={f.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={f.label}
            title={f.label}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(f.id)}
            className={cn("swatch", active && "swatch-active")}
          >
            <span className="swatch-dot" style={{ background: f.color }} />
          </button>
        );
      })}
    </div>
  );
}
