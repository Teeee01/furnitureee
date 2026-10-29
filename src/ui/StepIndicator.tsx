/** Step 2 of 5: a done step (green check), the active step (short white bar),
 *  three steps to come (grey dots). */
export function StepIndicator() {
  return (
    <div className="flex items-center gap-2" aria-label="Step 2 of 5">
      <span className="grid size-4 place-items-center rounded-full bg-success" aria-hidden="true">
        <svg viewBox="0 0 12 12" className="size-2.5" fill="none">
          <path d="M2.5 6.2 5 8.5l4.5-5" stroke="#0E0E10" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="h-1 w-6 rounded-full bg-fg" aria-hidden="true" />
      {[0, 1, 2].map((i) => (
        <span key={i} className="size-1.5 rounded-full bg-[#3A3A40]" aria-hidden="true" />
      ))}
    </div>
  );
}
